import * as Keychain from 'react-native-keychain';
import nacl from 'tweetnacl';
import { encode, decode } from '@ethersproject/base64';

export class OfflineAuthenticator {
  async getOrGenerateKeyPair() {
    // Check if the device already has a cryptographic identity
    const credentials = await Keychain.getGenericPassword({ service: 'opentriage_keys' });
    if (credentials) {
      const secretKey = decode(credentials.password);
      return nacl.sign.keyPair.fromSecretKey(secretKey);
    }
    
    // Generate a new Ed25519 keypair for first-time setup
    const keyPair = nacl.sign.keyPair();
    await Keychain.setGenericPassword('ed25519', encode(keyPair.secretKey), { service: 'opentriage_keys' });
    return keyPair;
  }

  async signPayload(payload: object) {
    const keyPair = await this.getOrGenerateKeyPair();
    // Convert payload to bytes for signing
    const message = Uint8Array.from(Buffer.from(JSON.stringify(payload)));
    const signature = nacl.sign.detached(message, keyPair.secretKey);
    
    return {
      payload,
      signature: Buffer.from(signature).toString('hex'),
      public_key: Buffer.from(keyPair.publicKey).toString('hex')
    };
  }
}