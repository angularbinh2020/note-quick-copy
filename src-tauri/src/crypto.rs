use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::RngCore;
use zeroize::Zeroize;

const KEY_SERVICE: &str = "note-quick-copy";
const KEY_ACCOUNT: &str = "notes-key";
pub const MAGIC: &[u8; 4] = b"NQC1";
pub const FORMAT_VERSION: u16 = 1;
const NONCE_LEN: usize = 12;
const TAG_LEN: usize = 16;

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEY_SERVICE, KEY_ACCOUNT)
        .map_err(|e| format!("Không truy cập được Windows Credential Manager (keyring): {e}"))
}

/// Lấy encryption key từ OS keyring; lần đầu chạy thì sinh key 32 bytes
/// (CSPRNG) và lưu vào keyring. Key được trả về dạng Vec<u8> — caller phải
/// zeroize sau khi dùng.
pub fn get_or_create_key() -> Result<Vec<u8>, String> {
    let entry = keyring_entry()?;
    match entry.get_password() {
        Ok(b64) => {
            let key = BASE64
                .decode(b64.trim())
                .map_err(|_| "Key trong keyring không hợp lệ (không phải base64).".to_string())?;
            if key.len() != 32 {
                return Err(format!(
                    "Key trong keyring có độ dài không đúng ({} bytes, cần 32).",
                    key.len()
                ));
            }
            Ok(key)
        }
        Err(keyring::Error::NoEntry) => {
            let mut key = vec![0u8; 32];
            rand::rngs::OsRng.fill_bytes(&mut key);
            entry
                .set_password(&BASE64.encode(&key))
                .map_err(|e| format!("Không lưu được key vào keyring: {e}"))?;
            Ok(key)
        }
        Err(e) => Err(format!("Không đọc được key từ keyring: {e}")),
    }
}

/// Format: MAGIC "NQC1" | version(u16 LE) | nonce(12B) | ciphertext + tag(16B)
pub fn encrypt(plaintext: &[u8], key: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Khởi tạo cipher thất bại: {e}"))?;
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Mã hóa thất bại: {e}"))?;

    let mut out = Vec::with_capacity(MAGIC.len() + 2 + NONCE_LEN + ciphertext.len());
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&FORMAT_VERSION.to_le_bytes());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

pub fn decrypt(blob: &[u8], key: &[u8]) -> Result<Vec<u8>, String> {
    let header_len = MAGIC.len() + 2 + NONCE_LEN;
    if blob.len() < header_len + TAG_LEN {
        return Err("File dữ liệu quá ngắn hoặc bị hỏng.".to_string());
    }
    if &blob[..4] != MAGIC {
        return Err("File dữ liệu sai định dạng (MAGIC không khớp).".to_string());
    }
    let version = u16::from_le_bytes([blob[4], blob[5]]);
    if version != FORMAT_VERSION {
        return Err(format!("Phiên bản format không được hỗ trợ: {version}"));
    }
    let nonce = Nonce::from_slice(&blob[6..6 + NONCE_LEN]);
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Khởi tạo cipher thất bại: {e}"))?;
    cipher
        .decrypt(nonce, &blob[header_len..])
        .map_err(|_| "Giải mã thất bại: key không khớp hoặc dữ liệu bị hỏng.".to_string())
}

pub fn zeroize_key(key: &mut Vec<u8>) {
    key.zeroize();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = vec![7u8; 32];
        let plaintext = br#"{"schemaVersion":1,"updatedAt":"x","groups":[],"items":[]}"#;
        let blob = encrypt(plaintext, &key).unwrap();
        assert_eq!(&blob[..4], MAGIC);
        assert_eq!(u16::from_le_bytes([blob[4], blob[5]]), FORMAT_VERSION);
        let decrypted = decrypt(&blob, &key).unwrap();
        assert_eq!(decrypted.as_slice(), plaintext.as_slice());
    }

    #[test]
    fn decrypt_rejects_wrong_key() {
        let key = vec![7u8; 32];
        let wrong = vec![8u8; 32];
        let blob = encrypt(b"secret", &key).unwrap();
        assert!(decrypt(&blob, &wrong).is_err());
    }

    #[test]
    fn decrypt_rejects_bad_magic() {
        let key = vec![1u8; 32];
        let mut blob = encrypt(b"hello", &key).unwrap();
        blob[0] = b'X';
        assert!(decrypt(&blob, &key).is_err());
    }

    #[test]
    fn keyring_roundtrip() {
        // Tạo/lấy key từ OS keyring: chạy lần 1 tạo mới, lần 2 đọc lại — cùng giá trị.
        let k1 = get_or_create_key().unwrap();
        let k2 = get_or_create_key().unwrap();
        assert_eq!(k1, k2);
        assert_eq!(k1.len(), 32);
    }
}
