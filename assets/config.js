/*
 * إعداد الربط بقاعدة النواة الرقمية (Supabase: labeedsch_PC)
 * المفتاح publishable عام وآمن للنشر؛ الحماية الفعلية بسياسات RLS وصلاحيات smart_plans:* في النواة.
 * لا تضع هنا مفتاح service_role أبدًا.
 * الحسابات والمنسوبون والأدوار من النواة مباشرة، وجداول النظام بالبادئة sp_.
 */
window.SMART_PLANS_CONFIG = {
  supabaseUrl: 'https://kbhovmnvqzgihhyibqkq.supabase.co',
  supabaseAnonKey: 'sb_publishable_hfzNlh9tCpuC2zCf4T_2FA_42ujADOX',
  bucket: 'sp-evidence',
  // الدخول بمعرّف: يُترجم داخليًا إلى بريد غير حقيقي بهذا النطاق (يطابق إعداد النواة)
  loginDomain: 'id.invalid',
  // قاعدة الخطط الذكية القديمة: تُستعمل في صفحة النقل migrate.html فقط (قراءة عامة)
  legacy: {
    url: 'https://dbgqlsvtccbsdiejspzc.supabase.co',
    key: 'sb_publishable_zCgmefSOAtDMaXQ0rWQ4Ig_G5xxw5YQ',
    bucket: 'evidence'
  }
};
