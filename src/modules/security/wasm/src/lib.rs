use wasm_bindgen::prelude::*;
use std::cell::RefCell;
use rand::Rng;

thread_local! {
    static TIME_COUNTER: RefCell<u64> = RefCell::new(0);
    static RNG: RefCell<rand::rngs::ThreadRng> = RefCell::new(rand::thread_rng());
    static ENCRYPTION_KEY: RefCell<Vec<u8>> = RefCell::new(vec![
        0x42, 0x65, 0x63, 0x72, 0x65, 0x74, 0x4b, 0x65, 0x79, // "SecretKey" in hex
        0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0
    ]);
}

#[wasm_bindgen]
pub fn increment_time() {
    TIME_COUNTER.with(|time| {
        *time.borrow_mut() += 1;
    });
}

#[wasm_bindgen]
pub fn get_time() -> u64 {
    TIME_COUNTER.with(|time| *time.borrow())
}

#[wasm_bindgen]
pub fn reset_time() {
    TIME_COUNTER.with(|time| {
        *time.borrow_mut() = 0;
    });
}

#[wasm_bindgen]
pub fn get_random() -> f64 {
    RNG.with(|rng| {
        rng.borrow_mut().gen::<f64>()
    })
}

#[wasm_bindgen]
pub fn get_random_range(min: i32, max: i32) -> i32 {
    RNG.with(|rng| {
        rng.borrow_mut().gen_range(min..max)
    })
}

#[wasm_bindgen]
pub fn encrypt(data: &str) -> String {
    let key = ENCRYPTION_KEY.with(|k| k.borrow().clone());
    let bytes = data.as_bytes();
    let encrypted: Vec<u8> = bytes.iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();

    // Convert to hex string
    encrypted.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<String>>()
        .join("")
}

#[wasm_bindgen]
pub fn decrypt(hex_data: &str) -> String {
    let key = ENCRYPTION_KEY.with(|k| k.borrow().clone());

    // Convert hex to bytes
    let bytes: Vec<u8> = (0..hex_data.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(&hex_data[i..i+2], 16).ok())
        .collect();

    // Decrypt with XOR
    let decrypted: Vec<u8> = bytes.iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect();

    String::from_utf8(decrypted).unwrap_or_default()
}

#[wasm_bindgen]
pub fn generate_hash(input: &str) -> String {
    // Simple hash function (DJB2 variant)
    let mut hash: u64 = 5381;
    for byte in input.bytes() {
        hash = ((hash << 5).wrapping_add(hash)).wrapping_add(byte as u64);
    }
    format!("{:016x}", hash)
}

#[wasm_bindgen]
pub fn generate_command_hash(function_id: u32, time: u64) -> String {
    let input = format!("{}:{}", function_id, time);
    generate_hash(&input)
}

#[wasm_bindgen]
pub fn generate_time_code() -> String {
    let time = get_time();
    let key = ENCRYPTION_KEY.with(|k| k.borrow().clone());
    let input = format!("time:{}:{}", time, key[0]);
    generate_hash(&input)
}
