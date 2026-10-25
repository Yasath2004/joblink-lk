export type LangCode = "GB" | "LK" | "IN";

export const languages: { code: LangCode; label: string }[] = [
  { code: "GB", label: "English" },
  { code: "LK", label: "සිංහල" },
  { code: "IN", label: "தமிழ்" },
];

type TranslationKey =
  | "welcome_back"
  | "sign_in_subtitle"
  | "phone_number"
  | "phone_placeholder"
  | "password"
  | "password_placeholder"
  | "login"
  | "forgot_password"
  | "quick_demo"
  | "worker_demo"
  | "employer_demo"
  | "no_account"
  | "sign_up"
  | "good_morning"
  | "good_afternoon"
  | "good_evening"
  | "search_jobs_placeholder"
  | "search_conversations_placeholder"
  | "settings"
  | "language"
  | "notifications_privacy"
  | "push_notifications"
  | "push_notifications_sub"
  | "location_access"
  | "location_access_sub"
  | "edit_profile"
  | "privacy_security"
  | "payment_methods"
  | "help_support"
  | "report_issue"
  | "home"
  | "applied"
  | "messages"
  | "profile"
  | "my_jobs"
  | "post_job_tab"
  | "jobs_found"
  | "no_jobs_found"
  | "invalid_phone"
  | "password_required"
  | "field_required"
  | "select_at_least_one_skill";

const en: Record<TranslationKey, string> = {
  welcome_back: "Welcome back",
  sign_in_subtitle: "Sign in to your JobLink LK account",
  phone_number: "Phone Number",
  phone_placeholder: "07X XXX XXXX",
  password: "Password",
  password_placeholder: "Enter password",
  login: "Login",
  forgot_password: "Forgot Password?",
  quick_demo: "Quick Demo",
  worker_demo: "Worker Demo",
  employer_demo: "Employer Demo",
  no_account: "No account? ",
  sign_up: "Sign up",
  good_morning: "Good morning,",
  good_afternoon: "Good afternoon,",
  good_evening: "Good evening,",
  search_jobs_placeholder: "Search jobs, categories...",
  search_conversations_placeholder: "Search conversations...",
  settings: "Settings",
  language: "Language / භාෂාව / மொழி",
  notifications_privacy: "Notifications & Privacy",
  push_notifications: "Push Notifications",
  push_notifications_sub: "Job alerts, messages, application updates",
  location_access: "Location Access",
  location_access_sub: "Find nearby jobs based on your location",
  edit_profile: "Edit Profile",
  privacy_security: "Privacy & Security",
  payment_methods: "Payment Methods",
  help_support: "Help & Support",
  report_issue: "Report an Issue",
  home: "Home",
  applied: "Applied",
  messages: "Messages",
  profile: "Profile",
  my_jobs: "My Jobs",
  post_job_tab: "Post Job",
  jobs_found: "jobs found",
  no_jobs_found: "No jobs match your search",
  invalid_phone: "Enter a valid phone number (07X XXX XXXX)",
  password_required: "Password is required",
  field_required: "This field is required",
  select_at_least_one_skill: "Select at least one skill",
};

const lk: Record<TranslationKey, string> = {
  welcome_back: "නැවත සාදරයෙන් පිළිගනිමු",
  sign_in_subtitle: "ඔබගේ JobLink LK ගිණුමට පිවිසෙන්න",
  phone_number: "දුරකථන අංකය",
  phone_placeholder: "07X XXX XXXX",
  password: "මුරපදය",
  password_placeholder: "මුරපදය ඇතුළත් කරන්න",
  login: "පිවිසෙන්න",
  forgot_password: "මුරපදය අමතකද?",
  quick_demo: "ඉක්මන් පෙන්වීම",
  worker_demo: "සේවකයා",
  employer_demo: "සේවායෝජකයා",
  no_account: "ගිණුමක් නැද්ද? ",
  sign_up: "ලියාපදිංචි වන්න",
  good_morning: "සුභ උදෑසනක්,",
  good_afternoon: "සුභ දහවලක්,",
  good_evening: "සුභ සන්ධ්‍යාවක්,",
  search_jobs_placeholder: "රැකියා, කාණ්ඩ සොයන්න...",
  search_conversations_placeholder: "සංවාද සොයන්න...",
  settings: "සැකසුම්",
  language: "Language / භාෂාව / மொழி",
  notifications_privacy: "දැනුම්දීම් සහ පෞද්ගලිකත්වය",
  push_notifications: "තල්ලු දැනුම්දීම්",
  push_notifications_sub: "රැකියා ඇඟවීම්, පණිවිඩ, අයදුම්පත් යාවත්කාලීන",
  location_access: "ස්ථාන ප්‍රවේශය",
  location_access_sub: "ඔබේ ස්ථානය අනුව ආසන්න රැකියා සොයාගන්න",
  edit_profile: "පැතිකඩ සංස්කරණය",
  privacy_security: "පෞද්ගලිකත්වය සහ ආරක්ෂාව",
  payment_methods: "ගෙවීම් ක්‍රම",
  help_support: "උදව් සහ සහාය",
  report_issue: "ගැටලුවක් වාර්තා කරන්න",
  home: "මුල් පිටුව",
  applied: "අයදුම්",
  messages: "පණිවිඩ",
  profile: "පැතිකඩ",
  my_jobs: "මගේ රැකියා",
  post_job_tab: "රැකියාවක් පළ කරන්න",
  jobs_found: "රැකියා හමු විය",
  no_jobs_found: "ඔබේ සෙවීමට ගැලපෙන රැකියා නැත",
  invalid_phone: "වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (07X XXX XXXX)",
  password_required: "මුරපදය අවශ්‍යයි",
  field_required: "මෙම කොටස අවශ්‍යයි",
  select_at_least_one_skill: "අවම වශයෙන් එක් කුසලතාවයක් තෝරන්න",
};

const ta: Record<TranslationKey, string> = {
  welcome_back: "மீண்டும் வரவேற்கிறோம்",
  sign_in_subtitle: "உங்கள் JobLink LK கணக்கில் உள்நுழையவும்",
  phone_number: "தொலைபேசி எண்",
  phone_placeholder: "07X XXX XXXX",
  password: "கடவுச்சொல்",
  password_placeholder: "கடவுச்சொல்லை உள்ளிடவும்",
  login: "உள்நுழைய",
  forgot_password: "கடவுச்சொல் மறந்துவிட்டதா?",
  quick_demo: "விரைவு டெமோ",
  worker_demo: "தொழிலாளி",
  employer_demo: "முதலாளி",
  no_account: "கணக்கு இல்லையா? ",
  sign_up: "பதிவு செய்க",
  good_morning: "காலை வணக்கம்,",
  good_afternoon: "மதிய வணக்கம்,",
  good_evening: "மாலை வணக்கம்,",
  search_jobs_placeholder: "வேலைகள், வகைகளைத் தேடுங்கள்...",
  search_conversations_placeholder: "உரையாடல்களைத் தேடுங்கள்...",
  settings: "அமைப்புகள்",
  language: "Language / භාෂාව / மொழி",
  notifications_privacy: "அறிவிப்புகள் & தனியுரிமை",
  push_notifications: "புஷ் அறிவிப்புகள்",
  push_notifications_sub: "வேலை எச்சரிக்கைகள், செய்திகள், விண்ணப்ப புதுப்பிப்புகள்",
  location_access: "இருப்பிட அணுகல்",
  location_access_sub: "உங்கள் இருப்பிடத்தின் அடிப்படையில் அருகிலுள்ள வேலைகளைக் கண்டறியவும்",
  edit_profile: "சுயவிவரத்தைத் திருத்து",
  privacy_security: "தனியுரிமை & பாதுகாப்பு",
  payment_methods: "கட்டண முறைகள்",
  help_support: "உதவி & ஆதரவு",
  report_issue: "சிக்கலைப் புகாரளி",
  home: "முகப்பு",
  applied: "விண்ணப்பங்கள்",
  messages: "செய்திகள்",
  profile: "சுயவிவரம்",
  my_jobs: "எனது வேலைகள்",
  post_job_tab: "வேலை இடுக",
  jobs_found: "வேலைகள் கிடைத்தன",
  no_jobs_found: "உங்கள் தேடலுக்குப் பொருந்தும் வேலைகள் இல்லை",
  invalid_phone: "சரியான தொலைபேசி எண்ணை உள்ளிடவும் (07X XXX XXXX)",
  password_required: "கடவுச்சொல் தேவை",
  field_required: "இந்தப் புலம் தேவை",
  select_at_least_one_skill: "குறைந்தது ஒரு திறமையைத் தேர்ந்தெடுக்கவும்",
};

export const translations: Record<LangCode, Record<TranslationKey, string>> = { GB: en, LK: lk, IN: ta };
