#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

static mut TIME_COUNTER: u64 = 0;
static mut RANDOM_STATE: u64 = 12345;
static ENCRYPTION_KEY: [u8; 16] = [
    0x42, 0x65, 0x63, 0x72, 0x65, 0x74, 0x4b, 0x65,
    0x79, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
];

#[no_mangle]
pub extern "C" fn increment_time() {
    unsafe {
        TIME_COUNTER += 1;
    }
}

#[no_mangle]
pub extern "C" fn get_time() -> u64 {
    unsafe { TIME_COUNTER }
}

#[no_mangle]
pub extern "C" fn reset_time() {
    unsafe {
        TIME_COUNTER = 0;
    }
}

#[no_mangle]
pub extern "C" fn get_random() -> f64 {
    unsafe {
        RANDOM_STATE ^= RANDOM_STATE << 13;
        RANDOM_STATE ^= RANDOM_STATE >> 7;
        RANDOM_STATE ^= RANDOM_STATE << 17;
        (RANDOM_STATE as f64) / (u64::MAX as f64)
    }
}

#[no_mangle]
pub extern "C" fn get_random_range(min: i32, max: i32) -> i32 {
    let random = get_random();
    min + (random * (max - min) as f64) as i32
}
