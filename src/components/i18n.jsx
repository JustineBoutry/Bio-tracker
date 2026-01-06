import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      "nav.setup": "Setup",
      "nav.dataEntry": "Enter Data",
      "nav.dataset": "Dataset",
      "nav.history": "Individual History",
      "nav.dashboard": "Dashboard",
      "nav.notebook": "Lab Notebook",
      "nav.cleanup": "Cleanup",
      "nav.exit": "Exit Experiment",
      "nav.download": "Download Data",
      
      // Common
      "common.alive": "Alive",
      "common.dead": "Dead",
      "common.cancel": "Cancel",
      "common.save": "Save",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.add": "Add",
      "common.search": "Search",
      "common.filter": "Filter",
      "common.export": "Export",
      "common.import": "Import",
      "common.loading": "Loading...",
      "common.total": "Total",
      "common.date": "Date",
      "common.status": "Status",
      "common.actions": "Actions",
      "common.confirm": "Confirm",
      "common.yes": "Yes",
      "common.no": "No",
      "common.close": "Close",
      "common.apply": "Apply",
    }
  },
  he: {
    translation: {
      // ניווט
      "nav.setup": "הגדרות",
      "nav.dataEntry": "הזנת נתונים",
      "nav.dataset": "מערך נתונים",
      "nav.history": "היסטוריית פרט",
      "nav.dashboard": "לוח בקרה",
      "nav.notebook": "מחברת מעבדה",
      "nav.cleanup": "ניקוי נתונים",
      "nav.exit": "יציאה מהניסוי",
      "nav.download": "הורדת נתונים",
      
      // כללי
      "common.alive": "חי",
      "common.dead": "מת",
      "common.cancel": "ביטול",
      "common.save": "שמירה",
      "common.delete": "מחיקה",
      "common.edit": "עריכה",
      "common.add": "הוספה",
      "common.search": "חיפוש",
      "common.filter": "סינון",
      "common.export": "ייצוא",
      "common.import": "ייבוא",
      "common.loading": "טוען...",
      "common.total": "סה\"כ",
      "common.date": "תאריך",
      "common.status": "סטטוס",
      "common.actions": "פעולות",
      "common.confirm": "אישור",
      "common.yes": "כן",
      "common.no": "לא",
      "common.close": "סגירה",
      "common.apply": "החל",
    }
  },
  ar: {
    translation: {
      // التنقل
      "nav.setup": "الإعداد",
      "nav.dataEntry": "إدخال البيانات",
      "nav.dataset": "مجموعة البيانات",
      "nav.history": "تاريخ الفرد",
      "nav.dashboard": "لوحة التحكم",
      "nav.notebook": "دفتر المختبر",
      "nav.cleanup": "تنظيف البيانات",
      "nav.exit": "الخروج من التجربة",
      "nav.download": "تنزيل البيانات",
      
      // عام
      "common.alive": "حي",
      "common.dead": "ميت",
      "common.cancel": "إلغاء",
      "common.save": "حفظ",
      "common.delete": "حذف",
      "common.edit": "تعديل",
      "common.add": "إضافة",
      "common.search": "بحث",
      "common.filter": "تصفية",
      "common.export": "تصدير",
      "common.import": "استيراد",
      "common.loading": "جاري التحميل...",
      "common.total": "المجموع",
      "common.date": "التاريخ",
      "common.status": "الحالة",
      "common.actions": "الإجراءات",
      "common.confirm": "تأكيد",
      "common.yes": "نعم",
      "common.no": "لا",
      "common.close": "إغلاق",
      "common.apply": "تطبيق",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;