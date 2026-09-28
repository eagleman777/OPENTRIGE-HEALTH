from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import asyncpg
import nacl.signing
import nacl.exceptions
import json
import os

app = FastAPI(title="OpenTriage Health API")

# DB Connection string (will be configured via Docker)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/opentriage")

class TriageData(BaseModel):
    payload: dict
    signature: str
    public_key: str

def verify_signature(public_key_hex: str, signature_hex: str, message: str):
    try:
        verify_key = nacl.signing.VerifyKey(bytes.fromhex(public_key_hex))
        verify_key.verify(message.encode('utf-8'), bytes.fromhex(signature_hex))
        return True
    except nacl.exceptions.BadSignatureError:
        return False

@app.post("/api/v1/sync")
async def sync_triage_data(data: TriageData):
    """Zero-trust offline synchronization endpoint"""
    message = json.dumps(data.payload, separators=(',', ':'))
    
    if not verify_signature(data.public_key, data.signature, message):
        raise HTTPException(status_code=401, detail="Invalid Ed25519 signature")
    
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Insert verified geospatial health data into PostGIS
        await conn.execute('''
            INSERT INTO triage_reports (patient_hash, geom, diagnosis, severity)
            VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)
        ''', data.payload.get('patient_hash'), data.payload.get('lon'), data.payload.get('lat'), data.payload.get('diagnosis'), data.payload.get('severity'))
    finally:
        await conn.close()
        
    return {"status": "success", "message": "Data synchronized securely"}

@app.get("/api/v1/clusters")
async def get_outbreak_clusters():
    """Geospatial clustering using PostGIS ST_ClusterDBSCAN"""
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Group outbreaks within ~5km (0.05 degrees) requiring min 3 cases
        clusters = await conn.fetch('''
            SELECT cid, ST_AsGeoJSON(ST_ConvexHull(ST_Collect(geom))) as boundary, COUNT(*) as case_count
            FROM (
                SELECT geom, ST_ClusterDBSCAN(geom, eps := 0.05, minpoints := 3) over () as cid
                FROM triage_reports
                WHERE severity = 'critical'
            ) sq
            WHERE cid IS NOT NULL
            GROUP BY cid;
        ''')
        return [dict(record) for record in clusters]
    finally:
        await conn.close()