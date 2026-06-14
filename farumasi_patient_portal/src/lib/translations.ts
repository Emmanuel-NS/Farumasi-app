import { useLanguageStore, type LangCode } from "@/store/language-store";
import { useTranslationOverlayStore } from "@/store/translation-overlay-store";

// ── Translation shape ─────────────────────────────────────────────────────────
export type T = {
  // Navigation
  nav_home: string;
  nav_health: string;
  nav_upload_rx: string;
  nav_consult: string;
  nav_orders: string;
  nav_settings: string;
  nav_notifications: string;
  nav_cart: string;
  nav_profile: string;
  nav_store: string;
  nav_help: string;
  nav_prescriptions: string;
  // Settings page
  settings_title: string;
  settings_subtitle: string;
  settings_notif: string;
  settings_notif_sub: string;
  settings_security: string;
  settings_security_sub: string;
  settings_transparency: string;
  settings_transparency_sub: string;
  settings_preferences: string;
  settings_preferences_sub: string;
  settings_language: string;
  settings_theme: string;
  settings_channels: string;
  settings_notif_types: string;
  settings_push: string;
  settings_email: string;
  settings_sms: string;
  settings_whatsapp: string;
  settings_order_updates: string;
  settings_health_tips: string;
  settings_promotions: string;
  settings_app_updates: string;
  settings_reminders: string;
  settings_change_password: string;
  settings_2fa: string;
  settings_data_privacy: string;
  settings_active_sessions: string;
  settings_app_permissions: string;
  settings_terms: string;
  settings_privacy_policy: string;
  settings_help_support: string;
  settings_about: string;
  // Consult page
  consult_title: string;
  consult_subtitle: string;
  consult_start: string;
  consult_btn_busy: string;
  consult_btn_offline: string;
  consult_disclaimer: string;
  consult_placeholder: string;
  consult_search_ph: string;
  consult_filter_all: string;
  consult_filter_available: string;
  consult_no_results: string;
  consult_clear_filters: string;
  consult_status_available: string;
  consult_status_busy: string;
  consult_status_offline: string;
  consult_yrs_exp: string;
  // Store page
  store_title: string;
  store_search_ph: string;
  store_subtitle: string;
  store_categories: string;
  store_pharmacies: string;
  store_viewing: string;
  store_no_medicines: string;
  store_try_search: string;
  store_read_more: string;
  store_full_details: string;
  store_add_cart: string;
  store_rx_btn: string;
  store_cats_toggle: string;
  store_select_cat: string;
  store_clear_all: string;
  store_sort: string;
  store_sort_by: string;
  store_sort_default: string;
  store_sort_price_asc: string;
  store_sort_price_desc: string;
  store_sort_rating: string;
  store_sort_name_asc: string;
  store_sort_name_desc: string;
  store_filter_availability: string;
  store_filter_rx_all: string;
  store_filter_rx_otc: string;
  store_filter_rx_required: string;
  store_available_at: string;
  store_in_stock: string;
  store_low_stock: string;
  store_out_of_stock: string;
  store_dosing: string;
  store_morning: string;
  store_afternoon: string;
  store_evening: string;
  store_side_effects: string;
  store_by: string;
  store_explore: string;
  store_filtered: string;
  store_results: string;
  store_at: string;
  store_rx_badge: string;
  store_about: string;
  store_cats_selected: string;
  store_showing_for: string;
  // Categories
  cat_all: string;
  cat_pain_relief: string;
  cat_antibiotics: string;
  cat_vitamins: string;
  cat_cold_flu: string;
  cat_skincare: string;
  cat_hygiene: string;
  cat_nutrition: string;
  cat_sexual_health: string;
  cat_mobility_aids: string;
  cat_mother_baby: string;
  cat_devices: string;
  cat_first_aid: string;
  cat_chronic_care: string;
  cat_diabetes: string;
  cat_allergy: string;
  cat_malaria: string;
  cat_digestive: string;
  cat_others: string;
  // Cart
  cart_empty: string;
  cart_empty_hint: string;
  cart_browse: string;
  cart_title: string;
  cart_step_cart: string;
  cart_step_delivery: string;
  cart_step_payment: string;
  cart_step_done: string;
  cart_summary: string;
  cart_subtotal: string;
  cart_delivery_fee: string;
  cart_free: string;
  cart_total: string;
  cart_continue_delivery: string;
  cart_free_applied: string;
  cart_free_threshold: string;
  cart_address_title: string;
  cart_full_name: string;
  cart_phone: string;
  cart_street: string;
  cart_district: string;
  cart_notes: string;
  cart_continue_payment: string;
  cart_payment_title: string;
  cart_momo: string;
  cart_airtel: string;
  cart_cash: string;
  cart_momo_number: string;
  cart_place_order: string;
  cart_confirmed_title: string;
  cart_confirmed_subtitle: string;
  cart_continue_shopping: string;
  cart_step_pharmacy: string;
  cart_step_details: string;
  cart_step_pay_short: string;
  cart_back_store: string;
  cart_back_rx: string;
  cart_edit_cart: string;
  cart_prices_note: string;
  cart_find_pharmacy: string;
  cart_fulfillment_delivery: string;
  cart_fulfillment_pickup: string;
  cart_ai_title: string;
  cart_ai_finding: string;
  cart_rx_finding: string;
  cart_ai_phase1: string;
  cart_ai_phase1_sub: string;
  cart_ai_phase2: string;
  cart_ai_phase2_items: string;
  cart_ai_phase3: string;
  cart_ai_phase3_gps: string;
  cart_ai_phase3_district: string;
  cart_ai_phase4: string;
  cart_ai_phase4_sub: string;
  cart_names_hidden: string;
  cart_names_hidden_sub: string;
  cart_no_match: string;
  cart_no_match_sub: string;
  cart_no_match_tip_title: string;
  cart_no_match_tip1: string;
  cart_no_match_tip2: string;
  cart_no_match_tip3: string;
  cart_pharmacy_label: string;
  cart_best_match: string;
  cart_best_value: string;
  cart_fastest: string;
  cart_full_stock: string;
  cart_nearest: string;
  cart_view_details: string;
  cart_match_score: string;
  cart_products_prices: string;
  cart_why_recommended: string;
  cart_not_available: string;
  cart_close_details: string;
  cart_delivery_unavailable: string;
  cart_continue_pharmacy: string;
  cart_continue_pharmacy_empty: string;
  cart_pickup_details: string;
  cart_delivery_details: string;
  cart_details_subtitle: string;
  cart_pickup_banner: string;
  cart_contact_details: string;
  cart_delivery_address: string;
  cart_select_district: string;
  cart_access_title: string;
  cart_access_pickup: string;
  cart_access_delivery: string;
  cart_access_min: string;
  cart_access_label: string;
  cart_payment_subtitle: string;
  cart_momo_push: string;
  cart_airtel_soon: string;
  cart_pay_now: string;
  cart_pay_after: string;
  cart_pay_after_sub: string;
  cart_estimated_fee: string;
  cart_free_pickup_label: string;
  cart_due_now: string;
  cart_processing: string;
  cart_creating: string;
  cart_momo_start: string;
  cart_momo_wait: string;
  cart_checkout_error: string;
  cart_your_access: string;
  cart_give_rider: string;
  cart_your_pharmacy: string;
  cart_delivery_in: string;
  cart_road_distance: string;
  cart_enable_location: string;
  cart_deliver_to: string;
  cart_payment_label: string;
  cart_insurance_savings: string;
  cart_charged_now: string;
  cart_total_charged: string;
  cart_delivery_after: string;
  cart_defer_banner: string;
  cart_partial: string;
  cart_whole_pack: string;
  cart_rx_category: string;
  cart_calculating: string;
  cart_delivery_too_far: string;
  cart_items_count: string;
  // Orders list
  orders_title: string;
  orders_active: string;
  orders_past: string;
  orders_no_active: string;
  orders_no_past: string;
  orders_track: string;
  // Order statuses
  status_pending: string;
  status_confirmed: string;
  status_preparing: string;
  status_ready: string;
  status_delivering: string;
  status_delivered: string;
  status_cancelled: string;
  // Order detail
  order_back: string;
  order_live: string;
  order_eta_min: string;
  order_driver: string;
  order_progress: string;
  order_current: string;
  order_cancelled: string;
  order_failed: string;
  order_not_completed: string;
  order_summary: string;
  order_total: string;
  order_location: string;
  order_step_placed: string;
  order_step_confirmed: string;
  order_step_preparing: string;
  order_step_ready: string;
  order_step_delivering: string;
  order_step_delivered: string;
  order_not_found: string;
  order_back_orders: string;
  // Health
  health_title: string;
  health_search_ph: string;
  health_tab_general: string;
  health_tab_remedies: string;
  health_tab_srh: string;
  health_tab_mental: string;
  health_tab_nutrition: string;
  health_tab_mother: string;
  health_tab_diyk: string;
  health_no_articles: string;
  health_read: string;
  health_min: string;
  // Prescriptions
  rx_title: string;
  rx_subtitle: string;
  rx_drop_title: string;
  rx_drop_here: string;
  rx_or_browse: string;
  rx_formats: string;
  rx_tips_title: string;
  rx_tip_1: string;
  rx_tip_2: string;
  rx_tip_3: string;
  rx_tip_4: string;
  rx_or: string;
  rx_take_photo: string;
  rx_view: string;
  rx_uploading: string;
  rx_upload_btn: string;
  rx_remove: string;
  rx_success_title: string;
  rx_success_sub: string;
  rx_upload_another: string;
  // Notifications
  notif_title: string;
  notif_unread: string;
  notif_mark_all: string;
  notif_filter_all: string;
  notif_filter_unread: string;
  notif_filter_read: string;
  notif_cat_all: string;
  notif_cat_order: string;
  notif_cat_health: string;
  notif_cat_promo: string;
  notif_cat_reminder: string;
  notif_empty: string;
  // Profile
  profile_title: string;
  profile_subtitle: string;
  profile_patient: string;
  profile_active: string;
  profile_full_name: string;
  profile_email: string;
  profile_phone: string;
  profile_save: string;
  profile_cancel: string;
  profile_edit: string;
  profile_updated: string;
  profile_appointments: string;
  profile_no_appts: string;
  profile_quick_links: string;
  profile_my_orders: string;
  profile_prescriptions: string;
  profile_settings: string;
  // Right panel
  panel_notif: string;
  panel_cart: string;
  panel_help: string;
  panel_unread: string;
  panel_mark_all: string;
  panel_no_notif: string;
  panel_view_all_notif: string;
  panel_cart_empty: string;
  panel_cart_hint: string;
  panel_browse: string;
  panel_total: string;
  panel_checkout: string;
  panel_view_cart: string;
  panel_help_subtitle: string;
  panel_help_faq: string;
  panel_help_chat: string;
  panel_help_call: string;
  panel_help_email: string;
  panel_help_still: string;
  panel_help_reach: string;
  panel_help_track: string;
  panel_help_upload_rx: string;
  panel_help_chat_pharm: string;
  panel_help_find_med: string;
  panel_help_account: string;
  // Toast templates (use tf() to interpolate {name})
  toast_added: string;
  toast_removed: string;
  toast_rx_toast: string;
  toast_rx_modal: string;
  // Common
  theme_light: string;
  theme_dark: string;
  theme_system: string;
  // Relative time
  time_just_now: string;
  time_min_ago: string;
  time_hr_ago: string;
  time_day_ago: string;
};

// ── Translations ──────────────────────────────────────────────────────────────
const translations: Record<LangCode, T> = {
  // ─── English ───────────────────────────────────────────────────────────────
  en: {
    nav_home: "Home",
    nav_health: "Health",
    nav_upload_rx: "Upload Rx",
    nav_consult: "Consult",
    nav_orders: "Orders",
    nav_settings: "Settings",
    nav_notifications: "Notifications",
    nav_cart: "Your Cart",
    nav_profile: "My Profile",
    nav_store: "Medicine Store",
    nav_help: "Help & Support",
    nav_prescriptions: "Prescriptions",
    settings_title: "Settings",
    settings_subtitle: "Manage your account preferences",
    settings_notif: "Notifications",
    settings_notif_sub: "Manage how you receive alerts",
    settings_security: "Security",
    settings_security_sub: "Password, access & data protection",
    settings_transparency: "Transparency & Control",
    settings_transparency_sub: "Permissions, terms, and data use",
    settings_preferences: "Preferences",
    settings_preferences_sub: "Language and display settings",
    settings_language: "Language",
    settings_theme: "Theme",
    settings_channels: "Channels",
    settings_notif_types: "Notification Types",
    settings_push: "Push Notifications",
    settings_email: "Email",
    settings_sms: "SMS",
    settings_whatsapp: "WhatsApp",
    settings_order_updates: "Order updates",
    settings_health_tips: "Health tips & articles",
    settings_promotions: "Promotions & offers",
    settings_app_updates: "App announcements",
    settings_reminders: "Medication reminders",
    settings_change_password: "Change Password",
    settings_2fa: "Two-Factor Authentication",
    settings_data_privacy: "Data Privacy & GDPR",
    settings_active_sessions: "Active Sessions",
    settings_app_permissions: "App Permissions",
    settings_terms: "Terms of Service",
    settings_privacy_policy: "Privacy Policy",
    settings_help_support: "Help & Support",
    settings_about: "About FARUMASI",
    consult_title: "Consult a Pharmacist",
    consult_subtitle: "Choose from our qualified pharmacists — all verified & licensed in Rwanda",
    consult_start: "Start Consult",
    consult_btn_busy: "Currently Busy",
    consult_btn_offline: "Offline",
    consult_disclaimer: "Replies are for general guidance only",
    consult_placeholder: "Type a message…",
    consult_search_ph: "Search by name, specialty or clinic…",
    consult_filter_all: "All",
    consult_filter_available: "Available",
    consult_no_results: "No pharmacists found",
    consult_clear_filters: "Clear filters",
    consult_status_available: "Available",
    consult_status_busy: "Busy",
    consult_status_offline: "Offline",
    consult_yrs_exp: "yrs exp",
    store_title: "Medicine Store",
    store_search_ph: "Search medicines…",
    store_subtitle: "Your trusted digital pharmacy partner in Rwanda",
    store_categories: "Browse Categories",
    store_pharmacies: "Pharmacies & Companies",
    store_viewing: "Viewing products",
    store_no_medicines: "No medicines found",
    store_try_search: "Try a different search or category",
    store_read_more: "Read more...",
    store_full_details: "Full Details",
    store_add_cart: "Add to Cart",
    store_rx_btn: "Requires Prescription",
    store_cats_toggle: "Categories",
    store_select_cat: "Select a category or search above",
    store_clear_all: "Clear all",
    store_sort: "Sort",
    store_sort_by: "Sort by:",
    store_sort_default: "Default",
    store_sort_price_asc: "Price: Low → High",
    store_sort_price_desc: "Price: High → Low",
    store_sort_rating: "Top Rated",
    store_sort_name_asc: "A → Z",
    store_sort_name_desc: "Z → A",
    store_filter_availability: "Availability",
    store_filter_rx_all: "All products",
    store_filter_rx_otc: "Over-the-counter (OTC)",
    store_filter_rx_required: "Prescription required",
    store_available_at: "Available at",
    store_in_stock: "In Stock",
    store_low_stock: "Low Stock",
    store_out_of_stock: "Out of Stock",
    store_dosing: "Dosing Schedule",
    store_morning: "Morning",
    store_afternoon: "Afternoon",
    store_evening: "Evening",
    store_side_effects: "Side Effects",
    store_by: "by",
    store_explore: "Explore Medicines",
    store_filtered: "Filtered Results",
    store_results: "Search Results",
    store_at: "Medicines at",
    store_rx_badge: "Rx Required",
    store_about: "About >",
    store_cats_selected: "{n} categories selected",
    store_showing_for: "Showing results for",
    cat_all: "All",
    cat_pain_relief: "Pain Relief",
    cat_antibiotics: "Antibiotics",
    cat_vitamins: "Vitamins",
    cat_cold_flu: "Cold & Flu",
    cat_skincare: "Skincare",
    cat_hygiene: "Hygiene",
    cat_nutrition: "Nutrition",
    cat_sexual_health: "Sexual Health",
    cat_mobility_aids: "Mobility Aids",
    cat_mother_baby: "Mother & Baby",
    cat_devices: "Devices",
    cat_first_aid: "First Aid",
    cat_chronic_care: "Chronic Care",
    cat_diabetes: "Diabetes",
    cat_allergy: "Allergy",
    cat_malaria: "Malaria",
    cat_digestive: "Digestive Health",
    cat_others: "Others",
    cart_empty: "Your cart is empty",
    cart_empty_hint: "Add medicines from the store to continue.",
    cart_browse: "Browse Medicines",
    cart_title: "Your Cart",
    cart_step_cart: "Cart",
    cart_step_delivery: "Delivery",
    cart_step_payment: "Payment",
    cart_step_done: "Done",
    cart_summary: "Order Summary",
    cart_subtotal: "Subtotal",
    cart_delivery_fee: "Delivery",
    cart_free: "FREE",
    cart_total: "Total",
    cart_continue_delivery: "Continue to Delivery",
    cart_free_applied: "Free delivery applied",
    cart_free_threshold: "Free delivery on orders above 10,000 RWF",
    cart_address_title: "Delivery Address",
    cart_full_name: "Full Name",
    cart_phone: "Phone Number",
    cart_street: "Street / Building",
    cart_district: "District",
    cart_notes: "Additional Notes (optional)",
    cart_continue_payment: "Continue to Payment",
    cart_payment_title: "Payment",
    cart_momo: "Pesapal",
    cart_airtel: "Airtel Money",
    cart_cash: "Cash on Delivery",
    cart_momo_number: "Mobile number for payment",
    cart_place_order: "Place Order",
    cart_confirmed_title: "Order Confirmed!",
    cart_confirmed_subtitle: "Your order has been placed successfully.",
    cart_continue_shopping: "Continue Shopping",
    cart_step_pharmacy: "Pharmacy",
    cart_step_details: "Details",
    cart_step_pay_short: "Pay",
    cart_back_store: "Back to store",
    cart_back_rx: "Back to prescriptions",
    cart_edit_cart: "Edit Cart",
    cart_prices_note: "Final prices are confirmed when you choose a pharmacy.",
    cart_find_pharmacy: "Find Best Pharmacy",
    cart_fulfillment_delivery: "Delivery",
    cart_fulfillment_pickup: "Pickup",
    cart_ai_title: "Farumasi AI",
    cart_ai_finding: "Finding your best match…",
    cart_rx_finding: "Finding best pharmacies for your prescription…",
    cart_ai_phase1: "Scanning partner pharmacies",
    cart_ai_phase1_sub: "Checking network availability",
    cart_ai_phase2: "Verifying stock for your items",
    cart_ai_phase2_items: "Your cart items",
    cart_ai_phase3: "Calculating proximity & delivery times",
    cart_ai_phase3_gps: "GPS location detected",
    cart_ai_phase3_district: "District-based estimate",
    cart_ai_phase4: "Ranking by compatibility score",
    cart_ai_phase4_sub: "Availability · price · speed · proximity",
    cart_names_hidden: "Pharmacy names are hidden",
    cart_names_hidden_sub: "until you complete payment — ensuring fair pricing and stock availability across our network.",
    cart_no_match: "No matching pharmacies found",
    cart_no_match_sub: "None of our partner pharmacies currently have all your cart items in stock.",
    cart_no_match_tip_title: "What you can do:",
    cart_no_match_tip1: "Remove items one by one and retry — partial matches may appear",
    cart_no_match_tip2: "Check back later — pharmacy stock is updated regularly",
    cart_no_match_tip3: "Contact support if an item is urgently needed",
    cart_pharmacy_label: "Pharmacy",
    cart_best_match: "Best Match",
    cart_best_value: "Best Value",
    cart_fastest: "Fastest",
    cart_full_stock: "Full stock",
    cart_nearest: "Nearest to you",
    cart_view_details: "View match details",
    cart_match_score: "Match score",
    cart_products_prices: "Medicines & prices",
    cart_why_recommended: "Why this pharmacy?",
    cart_not_available: "Not available",
    cart_close_details: "Close",
    cart_delivery_unavailable: "Delivery unavailable (>20 km)",
    cart_continue_pharmacy: "Continue with Pharmacy",
    cart_continue_pharmacy_empty: "Continue with Pharmacy …",
    cart_pickup_details: "Pickup Details",
    cart_delivery_details: "Delivery Details",
    cart_details_subtitle: "How would you like to receive your order?",
    cart_pickup_banner: "Pickup selected — no delivery fee. The pharmacy address will be revealed after payment.",
    cart_contact_details: "Contact Details",
    cart_delivery_address: "Delivery Address",
    cart_select_district: "Select district…",
    cart_access_title: "Order Access Code",
    cart_access_pickup: "Show this code at the pharmacy counter to collect your medicines.",
    cart_access_delivery: "Give this code to the rider at the door to confirm delivery.",
    cart_access_min: "Minimum 4 characters.",
    cart_access_label: "Access Code",
    cart_payment_subtitle: "Pay securely with Pesapal",
    cart_momo_push: "Card, MTN MoMo, or Airtel Money via Pesapal",
    cart_airtel_soon: "Coming soon — use MTN MoMo for now",
    cart_pay_now: "Pay now",
    cart_pay_after: "Pay after delivery arrives",
    cart_pay_after_sub: "Charged to your mobile money when delivered — no cash",
    cart_estimated_fee: "Estimated delivery fee",
    cart_free_pickup_label: "Free (Pickup)",
    cart_due_now: "Due now",
    cart_processing: "Processing…",
    cart_creating: "Creating order…",
    cart_momo_start: "Opening Pesapal checkout…",
    cart_momo_wait: "Waiting for payment confirmation…",
    cart_checkout_error: "Could not complete checkout. Please try again.",
    cart_your_access: "Your Access Code",
    cart_give_rider: "Give this to the rider when they arrive",
    cart_your_pharmacy: "Your Pharmacy",
    cart_delivery_in: "Delivery in ~{min} min",
    cart_road_distance: "{km} km from you",
    cart_enable_location: "Enable location to see road distance and delivery fee",
    cart_deliver_to: "Deliver to",
    cart_payment_label: "Payment",
    cart_insurance_savings: "Insurance savings",
    cart_charged_now: "Charged now",
    cart_total_charged: "Total charged",
    cart_delivery_after: "Delivery fee (after delivery)",
    cart_defer_banner: "Delivery fee billed after arrival.",
    cart_partial: "Partial",
    cart_whole_pack: "Whole pack",
    cart_rx_category: "Prescription",
    cart_calculating: "Calculating delivery times…",
    cart_delivery_too_far: "Delivery not available beyond 20 km outside Kigali. Switched to pickup.",
    cart_items_count: "{n} item(s) in cart",
    orders_title: "My Orders",
    orders_active: "Active Orders",
    orders_past: "Past Orders",
    orders_no_active: "No active orders",
    orders_no_past: "No past orders",
    orders_track: "Track",
    status_pending: "Pending",
    status_confirmed: "Confirmed",
    status_preparing: "Preparing",
    status_ready: "Ready for Pickup",
    status_delivering: "Out for Delivery",
    status_delivered: "Delivered",
    status_cancelled: "Cancelled",
    order_back: "Back to Orders",
    order_live: "LIVE TRACKING",
    order_eta_min: "min ETA",
    order_driver: "Your delivery driver",
    order_progress: "Order Progress",
    order_current: "Current status",
    order_cancelled: "Order Cancelled",
    order_failed: "Order Failed",
    order_not_completed: "This order was not completed.",
    order_summary: "Order Summary",
    order_total: "Total",
    order_location: "Kigali, Rwanda",
    order_step_placed: "Order Placed",
    order_step_confirmed: "Confirmed",
    order_step_preparing: "Preparing",
    order_step_ready: "Ready for Pickup",
    order_step_delivering: "Out for Delivery",
    order_step_delivered: "Delivered",
    order_not_found: "Order not found.",
    order_back_orders: "Back to Orders",
    health_title: "Discover Wellness",
    health_search_ph: "Search tips, remedies, facts...",
    health_tab_general: "General Tips",
    health_tab_remedies: "Remedies",
    health_tab_srh: "SRH",
    health_tab_mental: "Mental Health",
    health_tab_nutrition: "Nutrition",
    health_tab_mother: "Mother & Babies",
    health_tab_diyk: "Did You Know?",
    health_no_articles: "No articles in this section",
    health_read: "Read",
    health_min: "min",
    rx_title: "Upload Prescription",
    rx_subtitle: "Upload a clear photo or PDF of your prescription",
    rx_drop_title: "Drag & drop your prescription",
    rx_drop_here: "Drop it here!",
    rx_or_browse: "or browse files",
    rx_formats: "JPEG · PNG · PDF · Max 10 MB",
    rx_tips_title: "Tips for a valid prescription upload",
    rx_tip_1: "Photo must be clear and all text legible",
    rx_tip_2: "Include doctor's name, signature, and date",
    rx_tip_3: "Full prescription page — do not crop edges",
    rx_tip_4: "JPEG, PNG or PDF · Max 10 MB",
    rx_or: "or",
    rx_take_photo: "Take a Photo",
    rx_view: "View",
    rx_uploading: "Uploading...",
    rx_upload_btn: "Upload Prescription",
    rx_remove: "Remove",
    rx_success_title: "Prescription Sent!",
    rx_success_sub: "Our pharmacists will review it shortly",
    rx_upload_another: "Upload Another",
    notif_title: "Notifications",
    notif_unread: "{n} unread",
    notif_mark_all: "Mark all read",
    notif_filter_all: "All",
    notif_filter_unread: "Unread",
    notif_filter_read: "Read",
    notif_cat_all: "All",
    notif_cat_order: "Order",
    notif_cat_health: "Health",
    notif_cat_promo: "Promo",
    notif_cat_reminder: "Reminder",
    notif_empty: "No notifications",
    profile_title: "My Profile",
    profile_subtitle: "Manage your personal information",
    profile_patient: "Patient",
    profile_active: "Active",
    profile_full_name: "Full Name",
    profile_email: "Email Address",
    profile_phone: "Phone Number",
    profile_save: "Save Changes",
    profile_cancel: "Cancel",
    profile_edit: "Edit Profile",
    profile_updated: "Profile updated successfully",
    profile_appointments: "Appointments",
    profile_no_appts: "No scheduled appointments.",
    profile_quick_links: "Quick Links",
    profile_my_orders: "My Orders",
    profile_prescriptions: "Prescriptions",
    profile_settings: "Settings",
    panel_notif: "Notifications",
    panel_cart: "Your Cart",
    panel_help: "Help & Support",
    panel_unread: "{n} unread",
    panel_mark_all: "Mark all read",
    panel_no_notif: "No notifications",
    panel_view_all_notif: "View all notifications →",
    panel_cart_empty: "Your cart is empty",
    panel_cart_hint: "Browse medicines and add items to your cart.",
    panel_browse: "Browse Medicines",
    panel_total: "Total",
    panel_checkout: "Go to Checkout",
    panel_view_cart: "View Cart",
    panel_help_subtitle: "How can we help you today?",
    panel_help_faq: "Frequently Asked Questions",
    panel_help_chat: "Chat with Support",
    panel_help_call: "Call Us",
    panel_help_email: "Email Us",
    panel_help_still: "Still need help?",
    panel_help_reach: "Reach our support team",
    panel_help_track: "Track my order",
    panel_help_upload_rx: "Upload a prescription",
    panel_help_chat_pharm: "Chat with a pharmacist",
    panel_help_find_med: "Find a medicine",
    panel_help_account: "Account settings",
    toast_added: "{name} added to cart",
    toast_removed: "{name} removed from cart",
    toast_rx_toast: "{name} requires a prescription. Upload your prescription to order this medicine.",
    toast_rx_modal: "{name} requires a valid prescription. Go to Prescriptions to upload one.",
    theme_light: "Light",
    theme_dark: "Dark",
    theme_system: "System",
    time_just_now: "Just now",
    time_min_ago: "{n}m ago",
    time_hr_ago: "{n}h ago",
    time_day_ago: "{n}d ago",
  },

  // ─── Kinyarwanda ───────────────────────────────────────────────────────────
  rw: {
    nav_home: "Ahabanza",
    nav_health: "Ubuzima",
    nav_upload_rx: "Ohereza Rx",
    nav_consult: "Baza",
    nav_orders: "Ibyatumijwe",
    nav_settings: "Igenamiterere",
    nav_notifications: "Amatangazo",
    nav_cart: "Aguriro",
    nav_profile: "Umwirondoro",
    nav_store: "Duka ry'Imiti",
    nav_help: "Ubufasha",
    nav_prescriptions: "Impapuro z'Umuganga",
    settings_title: "Igenamiterere",
    settings_subtitle: "Genzura amahitamo y'konti yawe",
    settings_notif: "Amatangazo",
    settings_notif_sub: "Gengura uburyo uhabwa amatangazo",
    settings_security: "Umutekano",
    settings_security_sub: "Ijambo ry'ibanga, kwinjira no kurinda amakuru",
    settings_transparency: "Ubushyinguro & Ubutegetsi",
    settings_transparency_sub: "Uburenganzira, amasezerano, n'ikoreshwa ry'amakuru",
    settings_preferences: "Amahitamo",
    settings_preferences_sub: "Ururimi n'amategeko y'igaragazwa",
    settings_language: "Ururimi",
    settings_theme: "Ihangano",
    settings_channels: "Inzira",
    settings_notif_types: "Ubwoko bw'Amatangazo",
    settings_push: "Amatangazo Akanduka",
    settings_email: "Imeyili",
    settings_sms: "SMS",
    settings_whatsapp: "WhatsApp",
    settings_order_updates: "Amakuru y'amabwiriza",
    settings_health_tips: "Inama z'ubuzima",
    settings_promotions: "Amatangazo & Amakungu",
    settings_app_updates: "Amakuru y'igikorwa",
    settings_reminders: "Ibikumbuzo by'imiti",
    settings_change_password: "Hindura Ijambo ry'Ibanga",
    settings_2fa: "Kwemeza Inshuro Ebyiri",
    settings_data_privacy: "Ibanga ry'Amakuru",
    settings_active_sessions: "Ibikorwa Bigikorwa",
    settings_app_permissions: "Uburenganzira bw'Igikorwa",
    settings_terms: "Amasezerano y'Ikoreshwa",
    settings_privacy_policy: "Amategeko y'Ibanga",
    settings_help_support: "Ubufasha",
    settings_about: "Ibyerekeye FARUMASI",
    consult_title: "Baza Inzobere mu Miti",
    consult_subtitle: "Hitamo mu bazobere bacu — bose bemejwe kandi bafite uruhushya mu Rwanda",
    consult_start: "Tangira Kubaza",
    consult_btn_busy: "Arabuze",
    consult_btn_offline: "Ntarimo Ku Murongo",
    consult_disclaimer: "Ibisubizo ni ibisobanuro rusange gusa",
    consult_placeholder: "Andika ubutumwa…",
    consult_search_ph: "Shakisha izina, ubuhanga cyangwa kliniki…",
    consult_filter_all: "Bose",
    consult_filter_available: "Aboneka",
    consult_no_results: "Nta bazobere babonetse",
    consult_clear_filters: "Siba inzira z'isuzuma",
    consult_status_available: "Araboneka",
    consult_status_busy: "Arapfukamye",
    consult_status_offline: "Ntawo hano",
    consult_yrs_exp: "imyaka y'uburambe",
    store_title: "Duka ry'Imiti",
    store_search_ph: "Shakisha imiti…",
    store_subtitle: "Inshuti yawe ikizewe mu isoko ry'imiti mu Rwanda",
    store_categories: "Ibyiciro by'Imiti",
    store_pharmacies: "Amaduka n'Amakampuni",
    store_viewing: "Ureba ibikorwa",
    store_no_medicines: "Nta miti ibonetse",
    store_try_search: "Gerageza gushakisha ukundi cyangwa uhindure icyiciro",
    store_read_more: "Soma byinshi...",
    store_full_details: "Ibindi Bisobanuro",
    store_add_cart: "Shyira mu Aguriro",
    store_rx_btn: "Bisaba Impapuro z'Umuganga",
    store_cats_toggle: "Ibyiciro",
    store_select_cat: "Hitamo icyiciro cyangwa shakisha hejuru",
    store_clear_all: "Siba Byose",
    store_sort: "Tegeka",
    store_sort_by: "Tegeka ukurikije:",
    store_sort_default: "Bisanzwe",
    store_sort_price_asc: "Igiciro: Hasi → Hejuru",
    store_sort_price_desc: "Igiciro: Hejuru → Hasi",
    store_sort_rating: "Nziza Cyane",
    store_sort_name_asc: "A → Z",
    store_sort_name_desc: "Z → A",
    store_filter_availability: "Kuboneka",
    store_filter_rx_all: "Ibicuruzwa byose",
    store_filter_rx_otc: "Bitagomba impapuro (OTC)",
    store_filter_rx_required: "Bisaba impapuro z'umuganga",
    store_available_at: "Iboneka ku",
    store_in_stock: "Iriho",
    store_low_stock: "Hafi Gurangira",
    store_out_of_stock: "Ntiriguriwe",
    store_dosing: "Uko Ifatwa",
    store_morning: "Mu Gitondo",
    store_afternoon: "Masaha ya Saa Sita",
    store_evening: "Nimugoroba",
    store_side_effects: "Ingaruka",
    store_by: "na",
    store_explore: "Shakisha Imiti",
    store_filtered: "Ibisubizo Byashakishijwe",
    store_results: "Ibisubizo bya Gushakisha",
    store_at: "Imiti ya",
    store_rx_badge: "Bisaba Impapuro",
    store_about: "Ibyerekeye >",
    store_cats_selected: "Ibyiciro {n} byahiswemo",
    store_showing_for: "Ibisubizo bya",
    cat_all: "Byose",
    cat_pain_relief: "Gukuraho Ububabare",
    cat_antibiotics: "Imiti Irwanya Udukoko",
    cat_vitamins: "Vitamini",
    cat_cold_flu: "Gufura & Grippe",
    cat_skincare: "Kwita ku Ruhu",
    cat_hygiene: "Isuku",
    cat_nutrition: "Imirire",
    cat_sexual_health: "Ubuzima bw'Inimero",
    cat_mobility_aids: "Inafasi zo Kugenda",
    cat_mother_baby: "Umubyeyi n'Umwana",
    cat_devices: "Ibikoresho by'Ubuvuzi",
    cat_first_aid: "Ubufasha bwa Mbere",
    cat_chronic_care: "Imiti y'Indwara",
    cat_diabetes: "Diyabete",
    cat_allergy: "Aleriji",
    cat_malaria: "Malariya",
    cat_digestive: "Ubuzima bw'Umwirondoro",
    cat_others: "Ibindi",
    cart_empty: "Aguriro ryawe nta kintu kirimo",
    cart_empty_hint: "Ongeraho imiti mu iduka kugira ngo ukomeze.",
    cart_browse: "Shakisha Imiti",
    cart_title: "Aguriro Ryawe",
    cart_step_cart: "Aguriro",
    cart_step_delivery: "Gutanga",
    cart_step_payment: "Kwishyura",
    cart_step_done: "Birangiye",
    cart_summary: "Incamake y'Itumba",
    cart_subtotal: "Igiteranyo",
    cart_delivery_fee: "Gutanga",
    cart_free: "UBUNTU",
    cart_total: "Igiteranyo Cyose",
    cart_continue_delivery: "Komeza ku Gutanga",
    cart_free_applied: "Gutanga ubuntu kwashyizweho",
    cart_free_threshold: "Gutanga ubuntu ku mitumba isumba 10,000 RWF",
    cart_address_title: "Aderesi yo Gutunga",
    cart_full_name: "Amazina Yuzuye",
    cart_phone: "Nimero ya Telefoni",
    cart_street: "Isoko / Inzu",
    cart_district: "Akarere",
    cart_notes: "Amanota Yongeye (ntabwoba)",
    cart_continue_payment: "Komeza ku Kwishyura",
    cart_payment_title: "Uburyo bwo Kwishyura",
    cart_momo: "Pesapal",
    cart_airtel: "Airtel Money",
    cart_cash: "Amafaranga mu Ngufu",
    cart_momo_number: "Nimero ya telefoni yo kwishyura",
    cart_place_order: "Tanga Itumba",
    cart_confirmed_title: "Itumba Ryemejwe!",
    cart_confirmed_subtitle: "Itumba ryawe ryatanzwe neza.",
    cart_continue_shopping: "Komeza Kugura",
    cart_step_pharmacy: "Farumasi",
    cart_step_details: "Amakuru",
    cart_step_pay_short: "Kwishyura",
    cart_back_store: "Subira mu iduka",
    cart_back_rx: "Subira ku mategeko",
    cart_edit_cart: "Hindura Aguriro",
    cart_prices_note: "Igiciro cyemewe kimaze guhitamo farumasi.",
    cart_find_pharmacy: "Shaka Farumasi Nziza",
    cart_fulfillment_delivery: "Gutanga",
    cart_fulfillment_pickup: "Kwikura",
    cart_ai_title: "Farumasi AI",
    cart_ai_finding: "Turimo gushaka ibyagutera…",
    cart_rx_finding: "Turimo gushaka farumasi nziza ku mategeko yawe…",
    cart_ai_phase1: "Gusuzuma farumasi z'abafatanyabikorwa",
    cart_ai_phase1_sub: "Kureba ububiko mu murongo",
    cart_ai_phase2: "Kugenzura ububiko bw'ibicuruzwa byawe",
    cart_ai_phase2_items: "Ibicuruzwa mu guriro",
    cart_ai_phase3: "Gubara intera n'igihe cyo gutanga",
    cart_ai_phase3_gps: "Aho uri hwemerewe (GPS)",
    cart_ai_phase3_district: "Gushingira ku karere",
    cart_ai_phase4: "Gutondekanya ukubona neza",
    cart_ai_phase4_sub: "Ububiko · igiciro · vitesi · intera",
    cart_names_hidden: "Amazina ya farumasi yihishe",
    cart_names_hidden_sub: "kugeza kwishyura — kugira ngo igiciro n'ububiko bibe aderere.",
    cart_no_match: "Nta farumasi ihura",
    cart_no_match_sub: "Nta farumasi ifite ibicuruzwa byose mu guriro byawe.",
    cart_no_match_tip_title: "Ushobora gukora:",
    cart_no_match_tip1: "Kuraho ibintu kimwe kimwe ugerageze — ushobora kubona ibihura",
    cart_no_match_tip2: "Subira nyuma — ububiko buravugururwa",
    cart_no_match_tip3: "Vugana n'ubufasha niba bikenewe byihuse",
    cart_pharmacy_label: "Farumasi",
    cart_best_match: "Ihura Cyane",
    cart_best_value: "Igiciro Cyiza",
    cart_fastest: "Yihuta",
    cart_full_stock: "Ububiko bwuzuye",
    cart_nearest: "Iri hafi yawe",
    cart_view_details: "Reba ibisobanuro byuzuye",
    cart_match_score: "Amanota y'ihura",
    cart_products_prices: "Imiti n'ibiciro",
    cart_why_recommended: "Impamvu iyi farumasi?",
    cart_not_available: "Ntiboneka",
    cart_close_details: "Funga",
    cart_delivery_unavailable: "Gutanga ntibishoboka (>20 km)",
    cart_continue_pharmacy: "Komeza na Farumasi",
    cart_continue_pharmacy_empty: "Komeza na Farumasi …",
    cart_pickup_details: "Amakuru yo Kwikura",
    cart_delivery_details: "Amakuru yo Gutanga",
    cart_details_subtitle: "Ushaka kwakira itegeko ryawe gute?",
    cart_pickup_banner: "Wahisemo kwikura — nta fee yo gutanga. Aderesi izagaragara nyuma yo kwishyura.",
    cart_contact_details: "Amakuru yo Kuvugana",
    cart_delivery_address: "Aderesi yo Gutanga",
    cart_select_district: "Hitamo akarere…",
    cart_access_title: "Kode yo Kugera ku Itumba",
    cart_access_pickup: "Erekana iyi kode ku farumasi kugira ngo ubone imiti.",
    cart_access_delivery: "Ha umujogizi iyi kode ku muryango.",
    cart_access_min: "Byibuze inyuguti 4.",
    cart_access_label: "Kode yo Kugera",
    cart_payment_subtitle: "Wishyura neza na Pesapal",
    cart_momo_push: "Ikarita, MTN MoMo, cyangwa Airtel binyuze muri Pesapal",
    cart_airtel_soon: "Biraza vuba — ukoresha MTN MoMo ubu",
    cart_pay_now: "Kwishyura nonaha",
    cart_pay_after: "Kwishyura nyuma yo gutanga",
    cart_pay_after_sub: "Kwishyurwa kuri mobile money — nta cash",
    cart_estimated_fee: "Igiciro cyo gutanga giteganyijwe",
    cart_free_pickup_label: "Ubuntu (Kwikura)",
    cart_due_now: "Kwishyurwa nonaha",
    cart_processing: "Turimo gutunganya…",
    cart_creating: "Turimo gushyiraho itegeko…",
    cart_momo_start: "Gufungura Pesapal…",
    cart_momo_wait: "Tegereza kwemeza kwishyura…",
    cart_checkout_error: "Ntibyashobotse kurangiza. Ongera ugerageze.",
    cart_your_access: "Kode Yawe",
    cart_give_rider: "Ha umujogizi iyi kode akagera",
    cart_your_pharmacy: "Farumasi Yawe",
    cart_delivery_in: "Gutanga mu minota ~{min}",
    cart_road_distance: "km {km} kuva iwawe",
    cart_enable_location: "Emera aho uri kugira ngo ubone intera n'igiciro cyo gutanga",
    cart_deliver_to: "Gutanga kuri",
    cart_payment_label: "Kwishyura",
    cart_insurance_savings: "Igabanyiriza ry'ubwisungane",
    cart_charged_now: "Kwishyurwa nonaha",
    cart_total_charged: "Igiteranyo cyishyurwa",
    cart_delivery_after: "Igiciro cyo gutanga (nyuma yo gutanga)",
    cart_defer_banner: "Igiciro cyo gutanga cyishyurwa nyuma yo kugera.",
    cart_partial: "Igice",
    cart_whole_pack: "Ipaki yose",
    cart_rx_category: "Itegeko",
    cart_calculating: "Gubara igihe cyo gutanga…",
    cart_delivery_too_far: "Gutanga ntibishoboka hejuru ya 20 km hanze ya Kigali. Twahindutse kwikura.",
    cart_items_count: "Ibintu {n} mu guriro",
    orders_title: "Ibyatumijwe Byanjye",
    orders_active: "Ibitararangira Gutumizwa",
    orders_past: "Ibyarangije Gutumizwa",
    orders_no_active: "Nta mabwiriza agikorwa",
    orders_no_past: "Nta mabwiriza ashize",
    orders_track: "Kurikirana",
    status_pending: "Gutegereza",
    status_confirmed: "Byemejwe",
    status_preparing: "Bategura",
    status_ready: "Biteguye Gufatwa",
    status_delivering: "Biri mu Nzira",
    status_delivered: "Byagezwe",
    status_cancelled: "Byahagaritswe",
    order_back: "Subira ku Mabwiriza",
    order_live: "GUKURIKIRANA NZIMA",
    order_eta_min: "iminota ETA",
    order_driver: "Umutwara wawe",
    order_progress: "Iterambere ry'Itumba",
    order_current: "Aho bihagaze",
    order_cancelled: "Itumba Ryahagaritswe",
    order_failed: "Itumba Ryagiye Nabi",
    order_not_completed: "Iri tumba ntirirangijwe.",
    order_summary: "Incamake y'Itumba",
    order_total: "Igiteranyo Cyose",
    order_location: "Kigali, Rwanda",
    order_step_placed: "Itumba Ryatanzwe",
    order_step_confirmed: "Byemejwe",
    order_step_preparing: "Bategura",
    order_step_ready: "Biteguye Gufatwa",
    order_step_delivering: "Biri mu Nzira",
    order_step_delivered: "Byagezwe",
    order_not_found: "Itumba ntiriburikika.",
    order_back_orders: "Subira ku Mabwiriza",
    health_title: "Shaka Ubuzima",
    health_search_ph: "Shakisha inama, ubuvuzi, ukuri...",
    health_tab_general: "Inama Rusange",
    health_tab_remedies: "Ubuvuzi",
    health_tab_srh: "Ubuzima bw'Inimero",
    health_tab_mental: "Ubuzima bw'Umutima",
    health_tab_nutrition: "Imirire",
    health_tab_mother: "Umubyeyi n'Abana",
    health_tab_diyk: "Wari Uzi?",
    health_no_articles: "Nta makuru muri iki gice",
    health_read: "Soma",
    health_min: "min",
    rx_title: "Ohereza Impapuro z'Umuganga",
    rx_subtitle: "Ohereza ifoto cyangwa PDF y'impapuro z'umuganga wawe",
    rx_drop_title: "Kururura hano impapuro z'umuganga",
    rx_drop_here: "Kandomeka hano!",
    rx_or_browse: "cyangwa shakisha dosiye",
    rx_formats: "JPEG · PNG · PDF · Max 10 MB",
    rx_tips_title: "Inama zo kohereza impapuro nziza",
    rx_tip_1: "Ifoto igomba kuba nziza kandi inyandiko iri igaragara",
    rx_tip_2: "Shyiramo izina ry'umuganga, umukono, n'itariki",
    rx_tip_3: "Ipaji yose y'impapuro — ntidakuraho imipaka",
    rx_tip_4: "JPEG, PNG cyangwa PDF · Max 10 MB",
    rx_or: "cyangwa",
    rx_take_photo: "Fata Ifoto",
    rx_view: "Reba",
    rx_uploading: "Boherezwa...",
    rx_upload_btn: "Ohereza Impapuro",
    rx_remove: "Vaho",
    rx_success_title: "Impapuro Zumviswe!",
    rx_success_sub: "Inzobere zacu mu miti zirazisuzuma vuba",
    rx_upload_another: "Ohereza Izindi",
    notif_title: "Amatangazo",
    notif_unread: "{n} ntabwo asomwe",
    notif_mark_all: "Shyira Byose mu Busomwe",
    notif_filter_all: "Byose",
    notif_filter_unread: "Ntabwo Asomwe",
    notif_filter_read: "Asomwe",
    notif_cat_all: "Byose",
    notif_cat_order: "Itumba",
    notif_cat_health: "Ubuzima",
    notif_cat_promo: "Amakungu",
    notif_cat_reminder: "Ikibumbuzo",
    notif_empty: "Nta matangazo",
    profile_title: "Umwirondoro Wanjye",
    profile_subtitle: "Gengura amakuru yawe bwite",
    profile_patient: "Umurwayi",
    profile_active: "Akora",
    profile_full_name: "Amazina Yuzuye",
    profile_email: "Aderesi ya Imeyili",
    profile_phone: "Nimero ya Telefoni",
    profile_save: "Bika Impinduka",
    profile_cancel: "Hagarika",
    profile_edit: "Hindura Umwirondoro",
    profile_updated: "Umwirondoro wasanwe neza",
    profile_appointments: "Igikorwa cyo Gusura",
    profile_no_appts: "Nta makuru y'igikorwa.",
    profile_quick_links: "Inzira Zikuburira",
    profile_my_orders: "Amabwiriza Yanjye",
    profile_prescriptions: "Impapuro z'Umuganga",
    profile_settings: "Igenamiterere",
    panel_notif: "Amatangazo",
    panel_cart: "Aguriro Ryawe",
    panel_help: "Ubufasha & Inkunga",
    panel_unread: "{n} ntabwo asomwe",
    panel_mark_all: "Shyira Byose mu Busomwe",
    panel_no_notif: "Nta matangazo",
    panel_view_all_notif: "Reba amatangazo yose →",
    panel_cart_empty: "Aguriro ryawe nta kintu kirimo",
    panel_cart_hint: "Shakisha imiti maze ushyire ibintu mu aguriro ryawe.",
    panel_browse: "Shakisha Imiti",
    panel_total: "Igiteranyo Cyose",
    panel_checkout: "Genda Kwishyura",
    panel_view_cart: "Reba Aguriro",
    panel_help_subtitle: "Ni iki dushobora kukufasha uyu munsi?",
    panel_help_faq: "Ibibazo Bikunze Kubazwa",
    panel_help_chat: "Ganira n'Inkunga",
    panel_help_call: "Duhamagara",
    panel_help_email: "Dutwikire Imeyili",
    panel_help_still: "Ukeneye ubufasha bwiyongera?",
    panel_help_reach: "Vugana n'itsinda ryacu",
    panel_help_track: "Kurikirana itumba ryanjye",
    panel_help_upload_rx: "Ohereza impapuro z'umuganga",
    panel_help_chat_pharm: "Ganira na muganga w'imiti",
    panel_help_find_med: "Shaka umuti",
    panel_help_account: "Igenamiterere ry'konti",
    toast_added: "{name} yashyizwe mu aguriro",
    toast_removed: "{name} yakuwe mu aguriro",
    toast_rx_toast: "{name} bisaba impapuro z'umuganga. Ohereza impapuro kugira ngo utumbe.",
    toast_rx_modal: "{name} bisaba impapuro zemewe. Genda ku Impapuro z'Umuganga kuzohereza.",
    theme_light: "Urumuri",
    theme_dark: "Umukumbi",
    theme_system: "Sisitemu",
    time_just_now: "Ubu nyuma",
    time_min_ago: "Kaminuta {n} ishize",
    time_hr_ago: "Isaha {n} ishize",
    time_day_ago: "Iminsi {n} ishize",
  },

  // ─── Français ──────────────────────────────────────────────────────────────
  fr: {
    nav_home: "Accueil",
    nav_health: "Santé",
    nav_upload_rx: "Ordonnance",
    nav_consult: "Consulter",
    nav_orders: "Commandes",
    nav_settings: "Paramètres",
    nav_notifications: "Notifications",
    nav_cart: "Mon Panier",
    nav_profile: "Mon Profil",
    nav_store: "Pharmacie",
    nav_help: "Aide & Support",
    nav_prescriptions: "Prescriptions",
    settings_title: "Paramètres",
    settings_subtitle: "Gérez vos préférences de compte",
    settings_notif: "Notifications",
    settings_notif_sub: "Gérez comment vous recevez les alertes",
    settings_security: "Sécurité",
    settings_security_sub: "Mot de passe, accès et protection des données",
    settings_transparency: "Transparence & Contrôle",
    settings_transparency_sub: "Autorisations, conditions et utilisation des données",
    settings_preferences: "Préférences",
    settings_preferences_sub: "Langue et paramètres d'affichage",
    settings_language: "Langue",
    settings_theme: "Thème",
    settings_channels: "Canaux",
    settings_notif_types: "Types de Notifications",
    settings_push: "Notifications Push",
    settings_email: "E-mail",
    settings_sms: "SMS",
    settings_whatsapp: "WhatsApp",
    settings_order_updates: "Mises à jour des commandes",
    settings_health_tips: "Conseils santé & articles",
    settings_promotions: "Promotions & offres",
    settings_app_updates: "Annonces de l'application",
    settings_reminders: "Rappels de médicaments",
    settings_change_password: "Changer le Mot de Passe",
    settings_2fa: "Authentification à Deux Facteurs",
    settings_data_privacy: "Confidentialité & RGPD",
    settings_active_sessions: "Sessions Actives",
    settings_app_permissions: "Autorisations de l'Application",
    settings_terms: "Conditions d'Utilisation",
    settings_privacy_policy: "Politique de Confidentialité",
    settings_help_support: "Aide & Support",
    settings_about: "À Propos de FARUMASI",
    consult_title: "Consulter un Pharmacien",
    consult_subtitle: "Choisissez parmi nos pharmaciens qualifiés — tous vérifiés et agréés au Rwanda",
    consult_start: "Démarrer la Consultation",
    consult_btn_busy: "Actuellement Occupé",
    consult_btn_offline: "Hors Ligne",
    consult_disclaimer: "Les réponses sont à titre d'orientation générale uniquement",
    consult_placeholder: "Tapez un message…",
    consult_search_ph: "Rechercher par nom, spécialité ou clinique…",
    consult_filter_all: "Tous",
    consult_filter_available: "Disponible",
    consult_no_results: "Aucun pharmacien trouvé",
    consult_clear_filters: "Effacer les filtres",
    consult_status_available: "Disponible",
    consult_status_busy: "Occupé",
    consult_status_offline: "Hors ligne",
    consult_yrs_exp: "ans d'exp.",
    store_title: "Pharmacie en Ligne",
    store_search_ph: "Rechercher des médicaments…",
    store_subtitle: "Votre partenaire pharmaceutique numérique de confiance au Rwanda",
    store_categories: "Parcourir les Catégories",
    store_pharmacies: "Pharmacies & Entreprises",
    store_viewing: "Voir les produits",
    store_no_medicines: "Aucun médicament trouvé",
    store_try_search: "Essayez une autre recherche ou catégorie",
    store_read_more: "En savoir plus...",
    store_full_details: "Détails complets",
    store_add_cart: "Ajouter au Panier",
    store_rx_btn: "Ordonnance Requise",
    store_cats_toggle: "Catégories",
    store_select_cat: "Sélectionnez une catégorie ou recherchez ci-dessus",
    store_clear_all: "Tout effacer",
    store_sort: "Trier",
    store_sort_by: "Trier par :",
    store_sort_default: "Par défaut",
    store_sort_price_asc: "Prix : Croissant",
    store_sort_price_desc: "Prix : Décroissant",
    store_sort_rating: "Mieux notés",
    store_sort_name_asc: "A → Z",
    store_sort_name_desc: "Z → A",
    store_filter_availability: "Disponibilité",
    store_filter_rx_all: "Tous les produits",
    store_filter_rx_otc: "Sans ordonnance (OTC)",
    store_filter_rx_required: "Ordonnance requise",
    store_available_at: "Disponible chez",
    store_in_stock: "En Stock",
    store_low_stock: "Stock Faible",
    store_out_of_stock: "Rupture de Stock",
    store_dosing: "Posologie",
    store_morning: "Matin",
    store_afternoon: "Après-midi",
    store_evening: "Soir",
    store_side_effects: "Effets Secondaires",
    store_by: "par",
    store_explore: "Explorer les Médicaments",
    store_filtered: "Résultats Filtrés",
    store_results: "Résultats de Recherche",
    store_at: "Médicaments chez",
    store_rx_badge: "Ordonnance Requise",
    store_about: "Détails >",
    store_cats_selected: "{n} catégories sélectionnées",
    store_showing_for: "Résultats pour",
    cat_all: "Tout",
    cat_pain_relief: "Antidouleurs",
    cat_antibiotics: "Antibiotiques",
    cat_vitamins: "Vitamines",
    cat_cold_flu: "Rhume & Grippe",
    cat_skincare: "Soin de la Peau",
    cat_hygiene: "Hygiène",
    cat_nutrition: "Nutrition",
    cat_sexual_health: "Santé Sexuelle",
    cat_mobility_aids: "Aides à la Mobilité",
    cat_mother_baby: "Mère & Bébé",
    cat_devices: "Dispositifs Médicaux",
    cat_first_aid: "Premiers Secours",
    cat_chronic_care: "Maladies Chroniques",
    cat_diabetes: "Diabète",
    cat_allergy: "Allergie",
    cat_malaria: "Paludisme",
    cat_digestive: "Santé Digestive",
    cat_others: "Autres",
    cart_empty: "Votre panier est vide",
    cart_empty_hint: "Ajoutez des médicaments depuis la pharmacie pour continuer.",
    cart_browse: "Parcourir les Médicaments",
    cart_title: "Mon Panier",
    cart_step_cart: "Panier",
    cart_step_delivery: "Livraison",
    cart_step_payment: "Paiement",
    cart_step_done: "Terminé",
    cart_summary: "Récapitulatif",
    cart_subtotal: "Sous-total",
    cart_delivery_fee: "Livraison",
    cart_free: "GRATUIT",
    cart_total: "Total",
    cart_continue_delivery: "Continuer vers la Livraison",
    cart_free_applied: "Livraison gratuite appliquée",
    cart_free_threshold: "Livraison gratuite pour les commandes supérieures à 10 000 RWF",
    cart_address_title: "Adresse de Livraison",
    cart_full_name: "Nom Complet",
    cart_phone: "Numéro de Téléphone",
    cart_street: "Rue / Bâtiment",
    cart_district: "District",
    cart_notes: "Notes Supplémentaires (optionnel)",
    cart_continue_payment: "Continuer vers le Paiement",
    cart_payment_title: "Mode de Paiement",
    cart_momo: "Pesapal",
    cart_airtel: "Airtel Money",
    cart_cash: "Paiement à la Livraison",
    cart_momo_number: "Numéro mobile pour le paiement",
    cart_place_order: "Passer la Commande",
    cart_confirmed_title: "Commande Confirmée !",
    cart_confirmed_subtitle: "Votre commande a été passée avec succès.",
    cart_continue_shopping: "Continuer les Achats",
    cart_step_pharmacy: "Pharmacie",
    cart_step_details: "Détails",
    cart_step_pay_short: "Payer",
    cart_back_store: "Retour à la boutique",
    cart_back_rx: "Retour aux ordonnances",
    cart_edit_cart: "Modifier le panier",
    cart_prices_note: "Les prix finaux sont confirmés au choix de la pharmacie.",
    cart_find_pharmacy: "Trouver la meilleure pharmacie",
    cart_fulfillment_delivery: "Livraison",
    cart_fulfillment_pickup: "Retrait",
    cart_ai_title: "Farumasi IA",
    cart_ai_finding: "Recherche de la meilleure option…",
    cart_rx_finding: "Recherche des meilleures pharmacies pour votre ordonnance…",
    cart_ai_phase1: "Analyse des pharmacies partenaires",
    cart_ai_phase1_sub: "Vérification du réseau",
    cart_ai_phase2: "Vérification du stock",
    cart_ai_phase2_items: "Articles du panier",
    cart_ai_phase3: "Calcul de proximité et délais",
    cart_ai_phase3_gps: "Position GPS détectée",
    cart_ai_phase3_district: "Estimation par district",
    cart_ai_phase4: "Classement par score",
    cart_ai_phase4_sub: "Stock · prix · rapidité · proximité",
    cart_names_hidden: "Noms des pharmacies masqués",
    cart_names_hidden_sub: "jusqu'au paiement — pour garantir des prix et stocks équitables.",
    cart_no_match: "Aucune pharmacie correspondante",
    cart_no_match_sub: "Aucune pharmacie n'a tous vos articles en stock.",
    cart_no_match_tip_title: "Que faire :",
    cart_no_match_tip1: "Retirez des articles et réessayez",
    cart_no_match_tip2: "Revenez plus tard — stocks mis à jour régulièrement",
    cart_no_match_tip3: "Contactez le support si urgent",
    cart_pharmacy_label: "Pharmacie",
    cart_best_match: "Meilleur choix",
    cart_best_value: "Meilleur prix",
    cart_fastest: "Plus rapide",
    cart_full_stock: "Stock complet",
    cart_nearest: "La plus proche",
    cart_view_details: "Voir les détails",
    cart_match_score: "Score de correspondance",
    cart_products_prices: "Médicaments et prix",
    cart_why_recommended: "Pourquoi cette pharmacie ?",
    cart_not_available: "Indisponible",
    cart_close_details: "Fermer",
    cart_delivery_unavailable: "Livraison indisponible (>20 km)",
    cart_continue_pharmacy: "Continuer avec la pharmacie",
    cart_continue_pharmacy_empty: "Continuer avec la pharmacie …",
    cart_pickup_details: "Détails de retrait",
    cart_delivery_details: "Détails de livraison",
    cart_details_subtitle: "Comment souhaitez-vous recevoir votre commande ?",
    cart_pickup_banner: "Retrait sélectionné — pas de frais de livraison.",
    cart_contact_details: "Coordonnées",
    cart_delivery_address: "Adresse de livraison",
    cart_select_district: "Choisir un district…",
    cart_access_title: "Code d'accès commande",
    cart_access_pickup: "Présentez ce code au comptoir de la pharmacie.",
    cart_access_delivery: "Donnez ce code au livreur à la porte.",
    cart_access_min: "Minimum 4 caractères.",
    cart_access_label: "Code d'accès",
    cart_payment_subtitle: "Payez en toute sécurité avec Pesapal",
    cart_momo_push: "Carte, MTN MoMo ou Airtel Money via Pesapal",
    cart_airtel_soon: "Bientôt disponible — utilisez MTN MoMo",
    cart_pay_now: "Payer maintenant",
    cart_pay_after: "Payer à la livraison",
    cart_pay_after_sub: "Débit mobile money à la livraison — sans espèces",
    cart_estimated_fee: "Frais de livraison estimés",
    cart_free_pickup_label: "Gratuit (Retrait)",
    cart_due_now: "À payer maintenant",
    cart_processing: "Traitement…",
    cart_creating: "Création de la commande…",
    cart_momo_start: "Ouverture de Pesapal…",
    cart_momo_wait: "En attente de confirmation du paiement…",
    cart_checkout_error: "Échec du paiement. Veuillez réessayer.",
    cart_your_access: "Votre code d'accès",
    cart_give_rider: "Donnez-le au livreur à son arrivée",
    cart_your_pharmacy: "Votre pharmacie",
    cart_delivery_in: "Livraison ~{min} min",
    cart_road_distance: "{km} km de chez vous",
    cart_enable_location: "Activez la localisation pour voir la distance et les frais de livraison",
    cart_deliver_to: "Livrer à",
    cart_payment_label: "Paiement",
    cart_insurance_savings: "Économies assurance",
    cart_charged_now: "Facturé maintenant",
    cart_total_charged: "Total facturé",
    cart_delivery_after: "Frais de livraison (après livraison)",
    cart_defer_banner: "Frais de livraison facturés à l'arrivée.",
    cart_partial: "Partiel",
    cart_whole_pack: "Paquet entier",
    cart_rx_category: "Ordonnance",
    cart_calculating: "Calcul des délais de livraison…",
    cart_delivery_too_far: "Livraison indisponible au-delà de 20 km hors Kigali. Retrait activé.",
    cart_items_count: "{n} article(s) dans le panier",
    orders_title: "Mes Commandes",
    orders_active: "Commandes Actives",
    orders_past: "Commandes Passées",
    orders_no_active: "Aucune commande active",
    orders_no_past: "Aucune commande passée",
    orders_track: "Suivre",
    status_pending: "En Attente",
    status_confirmed: "Confirmée",
    status_preparing: "En Préparation",
    status_ready: "Prête pour Retrait",
    status_delivering: "En Livraison",
    status_delivered: "Livrée",
    status_cancelled: "Annulée",
    order_back: "Retour aux Commandes",
    order_live: "SUIVI EN DIRECT",
    order_eta_min: "min ETA",
    order_driver: "Votre livreur",
    order_progress: "Progression de la Commande",
    order_current: "Statut actuel",
    order_cancelled: "Commande Annulée",
    order_failed: "Commande Échouée",
    order_not_completed: "Cette commande n'a pas été complétée.",
    order_summary: "Récapitulatif",
    order_total: "Total",
    order_location: "Kigali, Rwanda",
    order_step_placed: "Commande Passée",
    order_step_confirmed: "Confirmée",
    order_step_preparing: "En Préparation",
    order_step_ready: "Prête pour Retrait",
    order_step_delivering: "En Livraison",
    order_step_delivered: "Livrée",
    order_not_found: "Commande introuvable.",
    order_back_orders: "Retour aux Commandes",
    health_title: "Découvrir le Bien-être",
    health_search_ph: "Rechercher des conseils, remèdes, faits...",
    health_tab_general: "Conseils Généraux",
    health_tab_remedies: "Remèdes",
    health_tab_srh: "SSR",
    health_tab_mental: "Santé Mentale",
    health_tab_nutrition: "Nutrition",
    health_tab_mother: "Mère & Bébés",
    health_tab_diyk: "Le Saviez-Vous ?",
    health_no_articles: "Aucun article dans cette section",
    health_read: "Lire",
    health_min: "min",
    rx_title: "Télécharger l'Ordonnance",
    rx_subtitle: "Téléchargez une photo claire ou un PDF de votre ordonnance",
    rx_drop_title: "Glissez-déposez votre ordonnance",
    rx_drop_here: "Déposez-la ici !",
    rx_or_browse: "ou parcourir les fichiers",
    rx_formats: "JPEG · PNG · PDF · Max 10 Mo",
    rx_tips_title: "Conseils pour une ordonnance valide",
    rx_tip_1: "La photo doit être claire et tout le texte lisible",
    rx_tip_2: "Inclure le nom du médecin, la signature et la date",
    rx_tip_3: "Page complète de l'ordonnance — ne pas rogner les bords",
    rx_tip_4: "JPEG, PNG ou PDF · Max 10 Mo",
    rx_or: "ou",
    rx_take_photo: "Prendre une Photo",
    rx_view: "Voir",
    rx_uploading: "Téléchargement...",
    rx_upload_btn: "Télécharger l'Ordonnance",
    rx_remove: "Supprimer",
    rx_success_title: "Ordonnance Envoyée !",
    rx_success_sub: "Nos pharmaciens la vérifieront sous peu",
    rx_upload_another: "Télécharger une Autre",
    notif_title: "Notifications",
    notif_unread: "{n} non lue(s)",
    notif_mark_all: "Tout marquer comme lu",
    notif_filter_all: "Toutes",
    notif_filter_unread: "Non Lues",
    notif_filter_read: "Lues",
    notif_cat_all: "Tout",
    notif_cat_order: "Commande",
    notif_cat_health: "Santé",
    notif_cat_promo: "Promo",
    notif_cat_reminder: "Rappel",
    notif_empty: "Aucune notification",
    profile_title: "Mon Profil",
    profile_subtitle: "Gérez vos informations personnelles",
    profile_patient: "Patient",
    profile_active: "Actif",
    profile_full_name: "Nom Complet",
    profile_email: "Adresse E-mail",
    profile_phone: "Numéro de Téléphone",
    profile_save: "Enregistrer",
    profile_cancel: "Annuler",
    profile_edit: "Modifier le Profil",
    profile_updated: "Profil mis à jour avec succès",
    profile_appointments: "Rendez-vous",
    profile_no_appts: "Aucun rendez-vous prévu.",
    profile_quick_links: "Liens Rapides",
    profile_my_orders: "Mes Commandes",
    profile_prescriptions: "Prescriptions",
    profile_settings: "Paramètres",
    panel_notif: "Notifications",
    panel_cart: "Mon Panier",
    panel_help: "Aide & Support",
    panel_unread: "{n} non lue(s)",
    panel_mark_all: "Tout marquer comme lu",
    panel_no_notif: "Aucune notification",
    panel_view_all_notif: "Voir toutes les notifications →",
    panel_cart_empty: "Votre panier est vide",
    panel_cart_hint: "Parcourez les médicaments et ajoutez des articles à votre panier.",
    panel_browse: "Parcourir les Médicaments",
    panel_total: "Total",
    panel_checkout: "Passer la Commande",
    panel_view_cart: "Voir le Panier",
    panel_help_subtitle: "Comment pouvons-nous vous aider aujourd'hui ?",
    panel_help_faq: "Questions Fréquentes",
    panel_help_chat: "Chat avec Support",
    panel_help_call: "Nous Appeler",
    panel_help_email: "Nous Écrire",
    panel_help_still: "Besoin d'aide supplémentaire ?",
    panel_help_reach: "Contacter notre équipe",
    panel_help_track: "Suivre ma commande",
    panel_help_upload_rx: "Télécharger une ordonnance",
    panel_help_chat_pharm: "Discuter avec un pharmacien",
    panel_help_find_med: "Trouver un médicament",
    panel_help_account: "Paramètres du compte",
    toast_added: "{name} ajouté au panier",
    toast_removed: "{name} retiré du panier",
    toast_rx_toast: "{name} nécessite une ordonnance. Téléchargez votre ordonnance pour commander.",
    toast_rx_modal: "{name} nécessite une ordonnance valide. Rendez-vous dans Prescriptions pour en télécharger une.",
    theme_light: "Clair",
    theme_dark: "Sombre",
    theme_system: "Système",
    time_just_now: "À l'instant",
    time_min_ago: "il y a {n} min",
    time_hr_ago: "il y a {n}h",
    time_day_ago: "il y a {n}j",
  },

  // ─── Swahili ───────────────────────────────────────────────────────────────
  sw: {
    nav_home: "Nyumbani",
    nav_health: "Afya",
    nav_upload_rx: "Pakia Rx",
    nav_consult: "Shauriana",
    nav_orders: "Maagizo",
    nav_settings: "Mipangilio",
    nav_notifications: "Arifa",
    nav_cart: "Kikapu",
    nav_profile: "Wasifu Wangu",
    nav_store: "Duka la Dawa",
    nav_help: "Msaada",
    nav_prescriptions: "Dawa za Daktari",
    settings_title: "Mipangilio",
    settings_subtitle: "Simamia mapendeleo ya akaunti yako",
    settings_notif: "Arifa",
    settings_notif_sub: "Simamia jinsi unavyopokea arifa",
    settings_security: "Usalama",
    settings_security_sub: "Nenosiri, ufikiaji na ulinzi wa data",
    settings_transparency: "Uwazi & Udhibiti",
    settings_transparency_sub: "Ruhusa, masharti, na matumizi ya data",
    settings_preferences: "Mapendeleo",
    settings_preferences_sub: "Lugha na mipangilio ya onyesho",
    settings_language: "Lugha",
    settings_theme: "Mandhari",
    settings_channels: "Njia",
    settings_notif_types: "Aina za Arifa",
    settings_push: "Arifa za Push",
    settings_email: "Barua Pepe",
    settings_sms: "SMS",
    settings_whatsapp: "WhatsApp",
    settings_order_updates: "Masasisho ya maagizo",
    settings_health_tips: "Vidokezo vya afya",
    settings_promotions: "Matangazo & ofa",
    settings_app_updates: "Matangazo ya programu",
    settings_reminders: "Vikumbusho vya dawa",
    settings_change_password: "Badilisha Nenosiri",
    settings_2fa: "Uthibitishaji wa Hatua Mbili",
    settings_data_privacy: "Faragha ya Data",
    settings_active_sessions: "Vikao Vilivyopo",
    settings_app_permissions: "Ruhusa za Programu",
    settings_terms: "Masharti ya Huduma",
    settings_privacy_policy: "Sera ya Faragha",
    settings_help_support: "Msaada",
    settings_about: "Kuhusu FARUMASI",
    consult_title: "Shauriana na Dawa",
    consult_subtitle: "Chagua kutoka kwa wataalam wetu wa dawa — wote wamethibitishwa Rwanda",
    consult_start: "Anza Ushauri",
    consult_btn_busy: "Ana Kazi Sasa",
    consult_btn_offline: "Nje ya Mtandao",
    consult_disclaimer: "Majibu ni kwa mwongozo wa jumla tu",
    consult_placeholder: "Andika ujumbe…",
    consult_search_ph: "Tafuta kwa jina, utaalamu au kliniki…",
    consult_filter_all: "Wote",
    consult_filter_available: "Wanapatikana",
    consult_no_results: "Hakuna wataalam walioopatikana",
    consult_clear_filters: "Futa vichujio",
    consult_status_available: "Yuko",
    consult_status_busy: "Ana shughuli",
    consult_status_offline: "Haipo",
    consult_yrs_exp: "miaka ya uzoefu",
    store_title: "Duka la Dawa",
    store_search_ph: "Tafuta dawa…",
    store_subtitle: "Mshirika wako wa dukani wa kidijitali nchini Rwanda",
    store_categories: "Vinjari Kategoria",
    store_pharmacies: "Maduka na Makampuni",
    store_viewing: "Kuangalia bidhaa",
    store_no_medicines: "Hakuna dawa zilizopatikana",
    store_try_search: "Jaribu utafutaji tofauti au kategoria",
    store_read_more: "Soma zaidi...",
    store_full_details: "Maelezo Kamili",
    store_add_cart: "Ongeza kwenye Kikapu",
    store_rx_btn: "Inahitaji Cheti cha Daktari",
    store_cats_toggle: "Kategoria",
    store_select_cat: "Chagua kategoria au tafuta juu",
    store_clear_all: "Futa Yote",
    store_sort: "Panga",
    store_sort_by: "Panga kwa:",
    store_sort_default: "Kawaida",
    store_sort_price_asc: "Bei: Chini → Juu",
    store_sort_price_desc: "Bei: Juu → Chini",
    store_sort_rating: "Zilizopigwa Kura Zaidi",
    store_sort_name_asc: "A → Z",
    store_sort_name_desc: "Z → A",
    store_filter_availability: "Upatikanaji",
    store_filter_rx_all: "Bidhaa zote",
    store_filter_rx_otc: "Bila cheti cha daktari (OTC)",
    store_filter_rx_required: "Inahitaji cheti cha daktari",
    store_available_at: "Inapatikana katika",
    store_in_stock: "Ipo Stokuni",
    store_low_stock: "Stoki Chini",
    store_out_of_stock: "Nje ya Stoki",
    store_dosing: "Mpango wa Kiwango",
    store_morning: "Asubuhi",
    store_afternoon: "Mchana",
    store_evening: "Jioni",
    store_side_effects: "Madhara",
    store_by: "na",
    store_explore: "Gundua Dawa",
    store_filtered: "Matokeo Yaliyochujwa",
    store_results: "Matokeo ya Utafutaji",
    store_at: "Dawa katika",
    store_rx_badge: "Inahitaji Cheti",
    store_about: "Kuhusu >",
    store_cats_selected: "Kategoria {n} zimechaguliwa",
    store_showing_for: "Matokeo ya",
    cat_all: "Zote",
    cat_pain_relief: "Kupunguza Maumivu",
    cat_antibiotics: "Viuavijasumu",
    cat_vitamins: "Vitamini",
    cat_cold_flu: "Mafua & Homa",
    cat_skincare: "Utunzaji wa Ngozi",
    cat_hygiene: "Usafi",
    cat_nutrition: "Lishe",
    cat_sexual_health: "Afya ya Uzazi",
    cat_mobility_aids: "Vifaa vya Kutembea",
    cat_mother_baby: "Mama na Mtoto",
    cat_devices: "Vifaa vya Matibabu",
    cat_first_aid: "Huduma ya Kwanza",
    cat_chronic_care: "Magonjwa ya Muda Mrefu",
    cat_diabetes: "Kisukari",
    cat_allergy: "Mzio",
    cat_malaria: "Malaria",
    cat_digestive: "Afya ya Utumbo",
    cat_others: "Mengine",
    cart_empty: "Kikapu chako ni tupu",
    cart_empty_hint: "Ongeza dawa kutoka dukani ili kuendelea.",
    cart_browse: "Vinjari Dawa",
    cart_title: "Kikapu Changu",
    cart_step_cart: "Kikapu",
    cart_step_delivery: "Utoaji",
    cart_step_payment: "Malipo",
    cart_step_done: "Imekamilika",
    cart_summary: "Muhtasari wa Agizo",
    cart_subtotal: "Jumla Ndogo",
    cart_delivery_fee: "Utoaji",
    cart_free: "BURE",
    cart_total: "Jumla",
    cart_continue_delivery: "Endelea na Utoaji",
    cart_free_applied: "Utoaji bure umetumika",
    cart_free_threshold: "Utoaji bure kwa maagizo zaidi ya 10,000 RWF",
    cart_address_title: "Anwani ya Utoaji",
    cart_full_name: "Jina Kamili",
    cart_phone: "Nambari ya Simu",
    cart_street: "Mtaa / Jengo",
    cart_district: "Wilaya",
    cart_notes: "Maelezo Zaidi (hiari)",
    cart_continue_payment: "Endelea na Malipo",
    cart_payment_title: "Njia ya Malipo",
    cart_momo: "Pesapal",
    cart_airtel: "Airtel Money",
    cart_cash: "Pesa Taslimu kwa Utoaji",
    cart_momo_number: "Nambari ya simu kwa malipo",
    cart_place_order: "Tuma Agizo",
    cart_confirmed_title: "Agizo Limethibitishwa!",
    cart_confirmed_subtitle: "Agizo lako limetumwa kwa mafanikio.",
    cart_continue_shopping: "Endelea Kununua",
    cart_step_pharmacy: "Duka la Dawa",
    cart_step_details: "Maelezo",
    cart_step_pay_short: "Lipa",
    cart_back_store: "Rudi kwenye duka",
    cart_back_rx: "Rudi kwa dawa za kuandikwa",
    cart_edit_cart: "Hariri Kikapu",
    cart_prices_note: "Bei za mwisho zinathibitishwa unapochagua duka la dawa.",
    cart_find_pharmacy: "Tafuta Duka Bora la Dawa",
    cart_fulfillment_delivery: "Uwasilishaji",
    cart_fulfillment_pickup: "Kuchukua",
    cart_ai_title: "Farumasi AI",
    cart_ai_finding: "Inatafuta mechi bora…",
    cart_rx_finding: "Inatafuta maduka bora kwa dawa yako…",
    cart_ai_phase1: "Inachambua maduka ya washirika",
    cart_ai_phase1_sub: "Inaangalia mtandao",
    cart_ai_phase2: "Inathibitisha hisa ya bidhaa zako",
    cart_ai_phase2_items: "Bidhaa za kikapu",
    cart_ai_phase3: "Inahesabu umbali na muda",
    cart_ai_phase3_gps: "GPS imegunduliwa",
    cart_ai_phase3_district: "Makadirio kwa wilaya",
    cart_ai_phase4: "Inapanga kwa alama",
    cart_ai_phase4_sub: "Hisa · bei · kasi · umbali",
    cart_names_hidden: "Majina ya maduka yamefichwa",
    cart_names_hidden_sub: "hadi malipo — bei na hisa za haki.",
    cart_no_match: "Hakuna duka linalolingana",
    cart_no_match_sub: "Hakuna duka lenye bidhaa zote za kikapu.",
    cart_no_match_tip_title: "Unaweza:",
    cart_no_match_tip1: "Ondoa bidhaa moja moja ujaribu tena",
    cart_no_match_tip2: "Rudi baadaye — hisa husasishwa",
    cart_no_match_tip3: "Wasiliana na msaada ikiwa ni dharura",
    cart_pharmacy_label: "Duka la Dawa",
    cart_best_match: "Mechi Bora",
    cart_best_value: "Thamani Bora",
    cart_fastest: "Haraka Zaidi",
    cart_full_stock: "Hisa kamili",
    cart_nearest: "Karibu nawe",
    cart_view_details: "Angalia maelezo",
    cart_match_score: "Alama ya mechi",
    cart_products_prices: "Dawa na bei",
    cart_why_recommended: "Kwa nini duka hili la dawa?",
    cart_not_available: "Haipatikani",
    cart_close_details: "Funga",
    cart_delivery_unavailable: "Uwasilishaji haupatikani (>20 km)",
    cart_continue_pharmacy: "Endelea na Duka",
    cart_continue_pharmacy_empty: "Endelea na Duka …",
    cart_pickup_details: "Maelezo ya Kuchukua",
    cart_delivery_details: "Maelezo ya Uwasilishaji",
    cart_details_subtitle: "Ungependa kupokea agizo lako vipi?",
    cart_pickup_banner: "Kuchukua kumechaguliwa — hakuna ada ya uwasilishaji.",
    cart_contact_details: "Maelezo ya Mawasiliano",
    cart_delivery_address: "Anwani ya Uwasilishaji",
    cart_select_district: "Chagua wilaya…",
    cart_access_title: "Msimbo wa Ufikiaji wa Agizo",
    cart_access_pickup: "Onyesha msimbo huu kwenye duka la dawa.",
    cart_access_delivery: "Mpe dereva msimbo huu mlangoni.",
    cart_access_min: "Angalau herufi 4.",
    cart_access_label: "Msimbo wa Ufikiaji",
    cart_payment_subtitle: "Lipa kwa usalama na Pesapal",
    cart_momo_push: "Kadi, MTN MoMo, au Airtel Money kupitia Pesapal",
    cart_airtel_soon: "Inakuja hivi karibuni — tumia MTN MoMo sasa",
    cart_pay_now: "Lipa sasa",
    cart_pay_after: "Lipa baada ya uwasilishaji",
    cart_pay_after_sub: "Malipo kwa mobile money — bila pesa taslimu",
    cart_estimated_fee: "Ada ya uwasilishaji inayokadiriwa",
    cart_free_pickup_label: "Bure (Kuchukua)",
    cart_due_now: "Kulipa sasa",
    cart_processing: "Inachakata…",
    cart_creating: "Inaunda agizo…",
    cart_momo_start: "Inafungua Pesapal…",
    cart_momo_wait: "Inasubiri uthibitisho wa malipo…",
    cart_checkout_error: "Imeshindwa kukamilisha. Jaribu tena.",
    cart_your_access: "Msimbo Wako",
    cart_give_rider: "Mpe dereva akifika",
    cart_your_pharmacy: "Duka Lako la Dawa",
    cart_delivery_in: "Uwasilishaji ~{min} dak",
    cart_road_distance: "{km} km kutoka kwako",
    cart_enable_location: "Washa eneo kupata umbali na ada ya uwasilishaji",
    cart_deliver_to: "Wasilisha kwa",
    cart_payment_label: "Malipo",
    cart_insurance_savings: "Akiba ya bima",
    cart_charged_now: "Inalipwa sasa",
    cart_total_charged: "Jumla inayolipwa",
    cart_delivery_after: "Ada ya uwasilishaji (baada ya uwasilishaji)",
    cart_defer_banner: "Ada ya uwasilishaji italipwa baada ya kufika.",
    cart_partial: "Sehemu",
    cart_whole_pack: "Kifurushi kamili",
    cart_rx_category: "Dawa ya kuandikwa",
    cart_calculating: "Inahesabu muda wa uwasilishaji…",
    cart_delivery_too_far: "Uwasilishaji haupatikani zaidi ya 20 km nje ya Kigali. Kuchukua kumechaguliwa.",
    cart_items_count: "Bidhaa {n} kwenye kikapu",
    orders_title: "Maagizo Yangu",
    orders_active: "Maagizo Yanayoendelea",
    orders_past: "Maagizo ya Zamani",
    orders_no_active: "Hakuna maagizo yanayoendelea",
    orders_no_past: "Hakuna maagizo ya zamani",
    orders_track: "Fuatilia",
    status_pending: "Inasubiri",
    status_confirmed: "Imethibitishwa",
    status_preparing: "Inaandaliwa",
    status_ready: "Iko Tayari kwa Kuchukua",
    status_delivering: "Inatolewa",
    status_delivered: "Imetolewa",
    status_cancelled: "Imefutwa",
    order_back: "Rudi kwa Maagizo",
    order_live: "UFUATILIAJI WA MOJA KWA MOJA",
    order_eta_min: "dakika ETA",
    order_driver: "Dereva wako wa utoaji",
    order_progress: "Maendeleo ya Agizo",
    order_current: "Hali ya Sasa",
    order_cancelled: "Agizo Limefutwa",
    order_failed: "Agizo Limeshindwa",
    order_not_completed: "Agizo hili halikukamilika.",
    order_summary: "Muhtasari wa Agizo",
    order_total: "Jumla",
    order_location: "Kigali, Rwanda",
    order_step_placed: "Agizo Limetumwa",
    order_step_confirmed: "Imethibitishwa",
    order_step_preparing: "Inaandaliwa",
    order_step_ready: "Iko Tayari kwa Kuchukua",
    order_step_delivering: "Inatolewa",
    order_step_delivered: "Imetolewa",
    order_not_found: "Agizo halijapatikana.",
    order_back_orders: "Rudi kwa Maagizo",
    health_title: "Gundua Afya",
    health_search_ph: "Tafuta vidokezo, dawa za nyumbani, ukweli...",
    health_tab_general: "Vidokezo vya Jumla",
    health_tab_remedies: "Tiba za Nyumbani",
    health_tab_srh: "Afya ya Uzazi",
    health_tab_mental: "Afya ya Akili",
    health_tab_nutrition: "Lishe",
    health_tab_mother: "Mama na Watoto",
    health_tab_diyk: "Je, Ulijua?",
    health_no_articles: "Hakuna makala katika sehemu hii",
    health_read: "Soma",
    health_min: "dak",
    rx_title: "Pakia Cheti cha Daktari",
    rx_subtitle: "Pakia picha wazi au PDF ya cheti chako cha daktari",
    rx_drop_title: "Buruta na uache cheti chako",
    rx_drop_here: "Iacha hapa!",
    rx_or_browse: "au vinjari faili",
    rx_formats: "JPEG · PNG · PDF · Ukubwa wa Juu 10 MB",
    rx_tips_title: "Vidokezo vya cheti halali",
    rx_tip_1: "Picha lazima iwe wazi na maandishi yote yasomeke",
    rx_tip_2: "Jumuisha jina la daktari, saini, na tarehe",
    rx_tip_3: "Ukurasa wote wa cheti — usikate kando",
    rx_tip_4: "JPEG, PNG au PDF · Ukubwa wa Juu 10 MB",
    rx_or: "au",
    rx_take_photo: "Piga Picha",
    rx_view: "Angalia",
    rx_uploading: "Inapakiwa...",
    rx_upload_btn: "Pakia Cheti",
    rx_remove: "Ondoa",
    rx_success_title: "Cheti Kimetumwa!",
    rx_success_sub: "Wataalam wetu wa dawa watakipitia hivi karibuni",
    rx_upload_another: "Pakia Kingine",
    notif_title: "Arifa",
    notif_unread: "{n} haijasomwa",
    notif_mark_all: "Weka Zote kama Zimesomwa",
    notif_filter_all: "Zote",
    notif_filter_unread: "Haijasomwa",
    notif_filter_read: "Imesomwa",
    notif_cat_all: "Zote",
    notif_cat_order: "Agizo",
    notif_cat_health: "Afya",
    notif_cat_promo: "Tangazo",
    notif_cat_reminder: "Ukumbusho",
    notif_empty: "Hakuna arifa",
    profile_title: "Wasifu Wangu",
    profile_subtitle: "Simamia taarifa zako binafsi",
    profile_patient: "Mgonjwa",
    profile_active: "Anafanya kazi",
    profile_full_name: "Jina Kamili",
    profile_email: "Anwani ya Barua Pepe",
    profile_phone: "Nambari ya Simu",
    profile_save: "Hifadhi Mabadiliko",
    profile_cancel: "Ghairi",
    profile_edit: "Hariri Wasifu",
    profile_updated: "Wasifu umesasishwa kwa mafanikio",
    profile_appointments: "Miadi",
    profile_no_appts: "Hakuna miadi iliyopangwa.",
    profile_quick_links: "Viungo vya Haraka",
    profile_my_orders: "Maagizo Yangu",
    profile_prescriptions: "Cheti cha Daktari",
    profile_settings: "Mipangilio",
    panel_notif: "Arifa",
    panel_cart: "Kikapu Changu",
    panel_help: "Msaada & Usaidizi",
    panel_unread: "{n} haijasomwa",
    panel_mark_all: "Weka Zote kama Zimesomwa",
    panel_no_notif: "Hakuna arifa",
    panel_view_all_notif: "Angalia arifa zote →",
    panel_cart_empty: "Kikapu chako ni tupu",
    panel_cart_hint: "Vinjari dawa na ongeza vitu kwenye kikapu chako.",
    panel_browse: "Vinjari Dawa",
    panel_total: "Jumla",
    panel_checkout: "Nenda kulipa",
    panel_view_cart: "Angalia Kikapu",
    panel_help_subtitle: "Tunaweza kukusaidia vipi leo?",
    panel_help_faq: "Maswali Yanayoulizwa Mara Kwa Mara",
    panel_help_chat: "Zungumza na Msaada",
    panel_help_call: "Tupigie Simu",
    panel_help_email: "Tutumie Barua Pepe",
    panel_help_still: "Bado unahitaji msaada?",
    panel_help_reach: "Wasiliana na timu yetu",
    panel_help_track: "Fuatilia agizo langu",
    panel_help_upload_rx: "Pakia cheti cha dawa",
    panel_help_chat_pharm: "Piga gumzo na daktari wa dawa",
    panel_help_find_med: "Tafuta dawa",
    panel_help_account: "Mipangilio ya akaunti",
    toast_added: "{name} imeongezwa kwenye kikapu",
    toast_removed: "{name} imeondolewa kwenye kikapu",
    toast_rx_toast: "{name} inahitaji cheti cha daktari. Pakia cheti chako ili kuagiza.",
    toast_rx_modal: "{name} inahitaji cheti halali cha daktari. Nenda kwenye Cheti cha Daktari kupakia kimoja.",
    theme_light: "Mwanga",
    theme_dark: "Giza",
    theme_system: "Sisitemu",
    time_just_now: "Sasa hivi",
    time_min_ago: "dakika {n} zilizopita",
    time_hr_ago: "saa {n} zilizopita",
    time_day_ago: "siku {n} zilizopita",
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTranslation(): T {
  const lang = useLanguageStore((s) => s.lang);
  const storeLang = useTranslationOverlayStore((s) => s.lang);
  const uiOverlay = useTranslationOverlayStore((s) => s.uiOverlay);
  const base = translations[lang];
  if (lang === "en" || storeLang !== lang || Object.keys(uiOverlay).length === 0) {
    return base;
  }
  return { ...base, ...uiOverlay };
}

/** Get translations without a hook (e.g. in non-component contexts). */
export function getTranslation(lang: LangCode): T {
  return translations[lang];
}

/**
 * Interpolate a translation template string.
 * e.g. tf(t.toast_added, { name: "Panadol" }) → "Panadol added to cart"
 */
export function tf(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

/** Hook returning a locale-aware timeAgo function for use in client components. */
export function useTimeAgo(): (date: Date | string) => string {
  const t = useTranslation();
  return (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t.time_just_now;
    if (mins < 60) return tf(t.time_min_ago, { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return tf(t.time_hr_ago, { n: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return tf(t.time_day_ago, { n: days });
    return d.toLocaleDateString();
  };
}
