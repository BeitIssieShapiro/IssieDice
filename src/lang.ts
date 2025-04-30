import * as RNLocalize from 'react-native-localize';
const locales = RNLocalize.getLocales();
const bestLanguage = locales[0]?.languageTag || 'en';
const deviceLanguageRaw = bestLanguage;

const supportedLanguages = ['he', 'en', 'ar'];

// Extract the first two characters of the language code (e.g., 'en', 'he')
const deviceLanguage = //"he"
    deviceLanguageRaw.split(/[-_]/)[0];

// Check if the detected language is supported, otherwise default to 'en'
export const gCurrentLang: string = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

console.log("Detected Language", deviceLanguageRaw, "Using Language", gCurrentLang);
export const isRight2Left = gCurrentLang.startsWith("he") || gCurrentLang.startsWith("ar");


const strings = {
    "en": {
        "ButtonTitle": "Button {1}",
        "Settings": "Settings",
        "About": "About",
        "DiceName": "Dice Name",
        "FacePreview": "Face Preview",
        "DiceSectionTitle": "Dice",
        "GeneralSectionTitle": "General",
        "ActiveDice": "Active Dice",
        "EnableSound": "Dice Sound",
        "ImportInProgress": "Import in progress...",
        "ImportError": "Import Error",
        "SuccessfulImport": "Import successful",
        "Load": "Load",
        "Export": "Export",
        "Rename": "Rename",
        "ProfileName": "Profile Name",
        "ProfileNoName": "Unnamed Profile",
        "DeleteProfileWarnning": "Are you sure you want to delete the profile {1}?",
        "DeleteCurrentProfileWarnning": "This is the active profile. Deleting it will reset the app. Continue?",
        "Cancel": "Cancel",
        "Delete": "Delete",
        "Backup": "Backup",
        "BackupAll": "Backup All",
        "ShareBackupWithTitle": "Backup",
        "ShareBackupEmailSubject": "Backup File",
        "ShareDiceWithTitle": "Dice Export",
        "ShareDiceEmailSubject": "Dice File",
        "ShareProfileWithTitle": "Profile Export",
        "ShareProfileEmailSubject": "Profile File",
        "ShareSuccessful": "File shared successfully",
        "ActionCancelled": "Action cancelled",
        "Create": "Create",
        "SetProfileName": "Enter a name for the new profile",
        "RenameProfile": "Rename Profile",
        "ProfileExists": "A profile named '{1}' already exists.",
        "ProfileExistsTitle": "Profile Exists",
        "Overwrite": "Overwrite",
        "ProfileSuccessRenamed": "Profile renamed successfully",
        "ProfileSuccessfulyCreated": "Profile created successfully",
        "ProfileSaveFailed": "Profile save failed",
        "InvalidName": "Invalid name. Avoid using the following characters: {1}",
        "NumberOfDice": "Number of Dice",
        "DiceSize": "Dice Size",
        "RecoveryTime": "Recovery Time",
        "TableColor": "Table Color",
        "Change": "Change",
        "OK": "OK",
        "Close": "Close",
        "List": "List",
        "Save":"Save",
        "SelectColor": "Select Color",
        "Select": "Select",
        "Edit": "Edit",
        "DiceSettings": "Dice Settings",
        "NoResultsMsg": "No results found",
        "EnterSearchHere": "Enter search here...",
        "BtnSearch": "Search",
        "SearchImageTitle": "Search Image",
        "MissingCameraPermission": "Camera access is required to take photos",
        "BtnCancel": "Cancel",
        "BtnSelect": "Select",
        "SelectProfileTitle": "Select Profile",
        "DeleteProfileTitle": "Delete Profile",
        "DeleteProfileAlert": "Deleting profile '{1}', are you sure?",

        "SelectDiceTitle": "Select Dice",
        "NoItemsFound": "No Items Found",
        "EditDice": "Edit Dice",
        "CreateDice": "Create Dice",
        "EditNameTitle": "Edit Name",
        "FaceTextLabel": "Enter Text for Dice Face",
        "MustHaveDiceNameBeforeAddFace": "You must select a name before editing faces",
        "FaceTypeText": "Text",
        "FaceTypeCamera": "Camera",
        "FaceTypeImage": "Image",
        "FaceTypeSearch": "Search",
        "Numbers": "Numbers",
        "Colors": "Colors",
        "Dots": "Dots",
        "EditFace": "Edit Face",
        "EditText": "Text",
        "EditBackground": "Background",
        "EditAudio": "Audio",
        "NewDieName": "Die {1}",
        "MigratedDieName": "Die from previous version {1}",
        "FontSize": "Size",
        "FontName": "Font",
        "Bold": "Bold",
        "TextColor": "Color",
        "FaceBackgroundColor": "Color",
        "SrcFromGallery": "Gallery",
        "SrcFromSearch": "Search",
        "SrcFromCamera": "Camera",
        "NoBackground": "Remove",
        "RecordAudio": "Record",
        "MigrateOldDice": "Loading dice from previous version",
        "DoneBtn": "OK",
        "DiceMissingName": "A die name is required",
        "InvalideDiceName": "Invalid die name. Avoid these characters: {1}",
        "AlreadyExistsDice": "A die with this name already exists",
        "ImportProfileExist": "Profile import failed. Profile '{1}' already exists",
        "ImportDiceExist": "Die import failed. Die '{1}' already exists",
        "DeleteDieTitle": "Delete Die",
        "DeleteDieAlert": "Delete die '{1}'?",
        "Rotate": "Rotate",
        "CancelBtn": "Cancel",
        "OpenIn": "Open in {1} seconds",
        "NoFont": "Default",
        "FaceBackgroundTab": "Background",
        "FaceTextTab": "Text",
        "FaceAudioTab": "Audio",
        "SelectFont": "Select Font",
    },
    "he": {
        "ImportError": "תקלה ביבוא",
        "ButtonTitle": "כפתור {1}",
        "Settings": "הגדרות",
        "About": "אודות",
        "DiceSectionTitle": "קוביות",
        "GeneralSectionTitle": "כללי",
        "DiceName": "שם קובייה",
        "FacePreview": "תצוגת פאה",
        "ActiveDice": "קובייה פעילה",
        "EnableSound": "צליל קוביות",
        "ImportInProgress": "הייבוא מתבצע...",
        "SuccessfulImport": "הייבוא הסתיים בהצלחה",
        "Load": "טעינה",
        "Export": "ייצוא",
        "Rename": "שינוי שם",
        "ProfileName": "שם פרופיל",
        "ProfileNoName": "פרופיל ללא שם",
        "DeleteProfileWarnning": "האם למחוק את הפרופיל {1}?",
        "DeleteCurrentProfileWarnning": "זהו הפרופיל הנוכחי. מחיקתו תאפס את האפליקציה. להמשיך?",
        "DeleteProfileTitle": "מחיקת פרופיל",
        "DeleteProfileAlert": "האם למחוק פרופיל {1}",
        "OK": "אישור",
        "Cancel": "ביטול",
        "Delete": "מחיקה",
        "Backup": "גיבוי",
        "BackupAll": "גיבוי הכל",
        "ShareBackupWithTitle": "גיבוי",
        "ShareBackupEmailSubject": "קובץ גיבוי",
        "ShareDiceWithTitle": "ייצוא קוביית משחק",
        "ShareDiceEmailSubject": "קובץ קובייה",
        "ShareProfileWithTitle": "ייצוא פרופיל",
        "ShareProfileEmailSubject": "קובץ פרופיל",
        "ShareSuccessful": "הקובץ נשלח בהצלחה",
        "ActionCancelled": "הפעולה בוטלה",
        "Create": "יצירה",
        "Save":"שמירה",
        "SetProfileName": "הזנת שם לפרופיל החדש",
        "RenameProfile": "שנה שם לפרופיל",
        "ProfileExists": "פרופיל בשם '{1}' כבר קיים.",
        "ProfileExistsTitle": "פרופיל קיים",
        "Overwrite": "דריסה",
        "ProfileSuccessRenamed": "שם הפרופיל שונה בהצלחה",
        "ProfileSuccessfulyCreated": "הפרופיל נוצר בהצלחה",
        "ProfileSaveFailed": "שמירת הפרופיל נכשלה",
        "InvalidName": "שם לא תקין. יש להימנע מהתווים הבאים: {1}",
        "NumberOfDice": "מספר קוביות",
        "DiceSize": "גודל הקובייה",
        "RecoveryTime": "זמן התאוששות",
        "TableColor": "צבע שולחן",
        "Change": "עריכה",
        "Close": "סגירה",
        "List": "רשימה",
        "SelectColor": "בחירת צבע",
        "Select": "בחירה",
        "Edit": "עריכה",
        "DiceSettings": "הגדרות קוביות",
        "NoResultsMsg": "לא נמצאו תוצאות",
        "EnterSearchHere": "חיפוש...",
        "BtnSearch": "חיפוש",
        "SearchImageTitle": "חיפוש תמונה",
        "MissingCameraPermission": "נדרש אישור למצלמה כדי לצלם תמונות",
        "BtnCancel": "ביטול",
        "BtnSelect": "בחר",
        "SelectProfileTitle": "בחירת פרופיל",
        "SelectDiceTitle": "בחירת קובייה",
        "NoItemsFound": "אין פריטים",
        "EditDice": "עריכת קוביה",
        "CreateDice": "יצירת קובייה חדשה",
        "EditNameTitle": "עריכת שם",
        "FaceTextLabel": "הכנסת טקסט לפאה",
        "MustHaveDiceNameBeforeAddFace": "יש לבחור שם לקובייה תחילה",
        "FaceTypeText": "טקסט",
        "FaceTypeCamera": "מצלמה",
        "FaceTypeImage": "תמונה",
        "FaceTypeSearch": "חיפוש",
        "Numbers": "מספרים",
        "Colors": "צבעים",
        "Dots": "נקודות",
        "EditFace": "עריכת פאה",
        "EditText": "טקסט",
        "EditBackground": "רקע",
        "EditAudio": "הקלטה",
        "NewDieName": "קוביה {1}",
        "MigratedDieName": "קוביה מגרסא קודמת {1}",
        "FontSize": "גודל",
        "FontName": "פונט",
        "Bold": "מודגש",
        "TextColor": "צבע",
        "FaceBackgroundColor": "צבע",
        "SrcFromGallery": "גלריה",
        "SrcFromSearch": "חיפוש",
        "SrcFromCamera": "מצלמה",
        "RecordAudio": "הקלטה",
        "NoBackground": "הסר רקע",

        "MigrateOldDice": "טוען קוביות מגרסא קודמת",
        "DoneBtn": "אישור",
        "DiceMissingName": "חובה לבחור שם לקוביה",
        "InvalideDiceName": "שם לא תקין. יש להימנע מהתווים הבאים: {1}",
        "AlreadyExistsDice": "קוביה בשם זה כבר קיימת",
        "ImportProfileExist": "יבוא פרופיל נכשל. פרופיל '{1}' כבר קיים",
        "ImportDiceExist": "יבוא קוביה נכשל. קובייה '{1}' כבר קיימת",
        "DeleteDieTitle": "מחיקת קובייה",
        "DeleteDieAlert": "'האם למחוק את הקובייה '{1}?",
        "Rotate": "סובב",
        "CancelBtn": "ביטול",
        "OpenIn": "פתיחה בעוד {1} שניות",

        "NoFont": "מערכת",
        "FaceBackgroundTab": "רקע",
        "FaceTextTab": "טקסט",
        "FaceAudioTab": "הקלטה",
        "SelectFont": "בחירת פונט",
    },
    "ar": {
        "ButtonTitle": "زر {1}",
        "Settings": "الإعدادات",
        "About": "حول",
        "DiceName": "اسم النرد",
        "ActiveDice": "النرد النشط",
        "ImportInProgress": "جارٍ استيراد البيانات...",
        "SuccessfulImport": "تم الاستيراد بنجاح",
        "Load": "تحميل",
        "Export": "تصدير",
        "Rename": "إعادة تسمية",
        "ProfileName": "اسم الملف الشخصي",
        "ProfileNoName": "ملف شخصي بدون اسم",
        "DeleteProfileWarnning": "هل أنت متأكد أنك تريد حذف الملف الشخصي {1}؟",
        "DeleteCurrentProfileWarnning": "هذا هو الملف الشخصي الحالي. سيؤدي حذفه إلى إعادة ضبط التطبيق. هل ترغب في المتابعة؟",
        "DeleteProfileTitle": "حذف الملف الشخصي",
        "Cancel": "إلغاء",
        "Delete": "حذف",
        "Backup": "النسخ الاحتياطي",
        "BackupAll": "نسخ احتياطي لكل شيء",
        "ShareBackupWithTitle": "نسخ احتياطي",
        "ShareBackupEmailSubject": "ملف النسخ الاحتياطي",
        "ShareDiceWithTitle": "تصدير النرد",
        "ShareDiceEmailSubject": "ملف النرد",
        "ShareProfileWithTitle": "تصدير الملف الشخصي",
        "ShareProfileEmailSubject": "ملف الملف الشخصي",
        "ShareSuccessful": "تمت مشاركة الملف بنجاح",
        "ActionCancelled": "تم إلغاء الإجراء",
        "Create": "إنشاء",
        "SetProfileName": "أدخل اسمًا للملف الشخصي الجديد",
        "RenameProfile": "إعادة تسمية الملف الشخصي",
        "ProfileExists": "يوجد بالفعل ملف شخصي باسم '{1}'.",
        "ProfileExistsTitle": "الملف الشخصي موجود",
        "Overwrite": "الكتابة فوق",
        "ProfileSuccessRenamed": "تمت إعادة تسمية الملف الشخصي بنجاح",
        "ProfileSuccessfulyCreated": "تم إنشاء الملف الشخصي بنجاح",
        "ProfileSaveFailed": "فشل حفظ الملف الشخصي",
        "NoResultsMsg": "لم يتم العثور على نتائج",
        "FaceTypeText": "نص",
        "FaceTypeCamera": "كاميرا",
        "FaceTypeImage": "صورة",
        "FaceTypeSearch": "بحث",
        "ImportError": "خطأ في الاستيراد",
        "OK": "موافق",
        "InvalidName": "اسم غير صالح. يرجى تجنب الأحرف التالية: {1}",
        "NumberOfDice": "عدد النرد",
        "DiceSize": "حجم النرد",
        "RecoveryTime": "وقت الاسترداد",
        "TableColor": "لون الطاولة",
        "Change": "تعديل",
        "Close": "إغلاق",
        "List": "قائمة",
        "SelectColor": "اختيار اللون",
        "Select": "اختيار",
        "Edit": "تعديل",
        "DiceSettings": "إعدادات النرد",
        "EnterSearchHere": "أدخل نص البحث...",
        "BtnSearch": "بحث",
        "SearchImageTitle": "بحث عن صورة",
        "MissingCameraPermission": "مطلوب إذن الكاميرا لالتقاط الصور",
        "BtnCancel": "إلغاء",
        "BtnSelect": "اختر",
        "SelectProfileTitle": "اختيار الملف الشخصي",
        "SelectDiceTitle": "اختيار النرد",
        "NoItemsFound": "لا توجد عناصر",
        "EditDice": "تعديل النرد",
        "CreateDice": "إنشاء نرد جديد",
        "EditNameTitle": "تعديل الاسم",
        "FaceTextLabel": "إدخال نص للوجه",
        "MustHaveDiceNameBeforeAddFace": "يجب اختيار اسم للنرد قبل إضافة وجه",
        "Numbers": "أرقام",
        "Colors": "ألوان",
        "Dots": "نقاط",
        "EditFace": "تعديل الوجه",
        "EditText": "نص",
        "EditBackground": "خلفية",
        "EditAudio": "تسجيل",
        "NewDieName": "نرد {1}",
        "MigratedDieName": "نرد من النسخة السابقة {1}",
        "FontSize": "حجم الخط",
        "FontName": "اسم الخط",
        "Bold": "عريض",
        "TextColor": "لون النص",
        "FaceBackgroundColor": "لون الخلفية",
        "SrcFromGallery": "المعرض",
        "SrcFromSearch": "بحث",
        "SrcFromCamera": "كاميرا",
        "NoBackground": "إزالة الخلفية",
        "MigrateOldDice": "جارٍ تحميل النرد من النسخة السابقة",
        "DoneBtn": "تم",
        "DiceMissingName": "يجب اختيار اسم للنرد",
        "InvalideDiceName": "اسم غير صالح. يرجى تجنب الأحرف التالية: {1}",
        "AlreadyExistsDice": "نرد بهذا الاسم موجود بالفعل",
        "ImportProfileExist": "فشل استيراد الملف الشخصي. الملف الشخصي '{1}' موجود بالفعل",
        "ImportDiceExist": "فشل استيراد النرد. النرد '{1}' موجود بالفعل",
        "DeleteDieTitle": "حذف النرد",
        "DeleteDieAlert": "هل تريد حذف النرد '{1}'؟",
        "Rotate": "تدوير",
        "CancelBtn": "إلغاء",

        "NoFont": "Default",
        "AlefFont": "Alef",
        "GveretLevinFont": "Ms. Levin",
        "DabaYadFont": "Dana-Yad",
        "DavidLibreFont": "David Libre",
        "ArielHebrewFont": "Ariel - Hebrew",
        "ArialFont": "Arial",

        "DeleteProfileAlert": "هل تريد حذف الملف الشخصي {1}؟",
        "RecordAudio": "تسجيل الصوت",
        "OpenIn": "فتح خلال {1} ثانية",
        "FaceBackgroundTab": "خلفية",
        "FaceTextTab": "نص",
        "FaceAudioTab": "تسجيل"
    }
};



function findMissing() {
    let missing = ""
    //English
    console.log("Missing in English:")
    Object.entries(strings.he).forEach(([key, value]) => {
        if (!strings.en[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);
    missing = "";
    console.log("\n\nMissing in Arabic:")
    Object.entries(strings.he).forEach(([key, value]) => {
        if (!strings.ar[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);

    missing = "";
    console.log("\n\nMissing in Hebrew:")
    Object.entries(strings.en).forEach(([key, value]) => {
        if (!strings.he[key]) {
            missing += "\"" + key + "\":" + "\"" + value + "\",\n";
        }
    })
    console.log(missing);

}
//findMissing();


const currStrings = strings[deviceLanguage];

export function isRTL() {
    return isRight2Left;
}

export function translate(id: string) {
    return currStrings[id] || id;
}

export function fTranslate(id: string, ...args: any[]): string {
    return replaceArgs(translate(id), args);
}

function replaceArgs(s: string, args: any) {
    return s.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number - 1] != 'undefined'
            ? args[number - 1]
            : match
            ;
    });
}