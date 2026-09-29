import nacl.signing
import json

signing_key = nacl.signing.SigningKey.generate()
payload = {
    'patient_hash': 'anon_8472',
    'lon': 7.91,
    'lat': 5.03,
    'diagnosis': 'suspected_tb',
    'severity': 'critical'
}
message = json.dumps(payload, separators=(',', ':')).encode('utf-8')
signature = signing_key.sign(message).signature

print(json.dumps({
    'payload': payload,
    'signature': signature.hex(),
    'public_key': signing_key.verify_key.encode().hex()
}, indent=2))
