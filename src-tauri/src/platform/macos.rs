use std::ffi::c_void;

#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn AXIsProcessTrustedWithOptions(options: *const c_void) -> bool;
}

#[link(name = "CoreFoundation", kind = "framework")]
unsafe extern "C" {
    fn CFDictionaryCreate(
        allocator: *const c_void,
        keys: *const *const c_void,
        values: *const *const c_void,
        num_values: isize,
        key_callbacks: *const c_void,
        value_callbacks: *const c_void,
        ) -> *const c_void;
    fn CFRelease(cf: *const c_void);

    static kCFBooleanTrue: *const c_void;
    static kCFTypeDictionaryKeyCallBacks: c_void;
    static kCFTypeDictionaryValueCallBacks: c_void;
}

// kAXTrustedCheckOptionPrompt key
fn get_prompt_key() -> *const c_void {
    // This is the CFString "AXTrustedCheckOptionPrompt"
    unsafe extern "C" {
        fn CFStringCreateWithCString(
            alloc: *const c_void,
            c_str: *const u8,
            encoding: u32,
        ) -> *const c_void;
    }
    unsafe {
        CFStringCreateWithCString(
            std::ptr::null(),
            b"AXTrustedCheckOptionPrompt\0".as_ptr(),
            0x08000100, // kCFStringEncodingUTF8
        )
    }
}

/// Check if the app has macOS Accessibility permission.
/// If `prompt` is true and permission is not granted, macOS will show the
/// system prompt asking the user to enable it in System Settings.
pub fn check_accessibility_permission() -> bool {
    unsafe {
        let key = get_prompt_key();
        let value = kCFBooleanTrue;

        let keys = [key];
        let values = [value];

        let options = CFDictionaryCreate(
            std::ptr::null(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            &kCFTypeDictionaryKeyCallBacks as *const _ as *const c_void,
            &kCFTypeDictionaryValueCallBacks as *const _ as *const c_void,
        );

        let trusted = AXIsProcessTrustedWithOptions(options);

        if !options.is_null() {
            CFRelease(options);
        }
        if !key.is_null() {
            CFRelease(key);
        }

        trusted
    }
}
