import { ScrollView, StyleSheet, Text, View } from "react-native";
import Icon from 'react-native-vector-icons/AntDesign';
import { gCurrentLang } from "./lang";


const about = {
    he: `
# אודות IssieDice
אפליקציית IssieDice נולדה מתוך צורך אמיתי להנגיש משחקי קופסא ופעילויות כיתתיות לכלל המשתמשים – כולל ילדים ובוגרים עם מוגבלויות. היא מאפשרת ליצור ולשחק בקוביות דיגיטליות מותאמות אישית בקלות, ישירות על מסך האייפד.

האפליקציה פותחה על ידי המרכז הטכנולוגי של בית איזי שפירא בשיתוף מתנדבים ממעבדות SAP ישראל, כחלק מסדרת אפליקציות חדשניות להנגשה וטכנולוגיה מסייעת.

## בגרסה החדשה של IssieDice:
- יצירת קוביות מותאמות אישית עם: הקלטות קוליות, טקסטים, רקע מותאם מתמונה שצולמה או מחיפוש באינטרנט
- תמיכה בעד 4 קוביות שונות במשחק
- יצירה וניהול פרופילים אישיים
- שיתוף פרופילים וקוביות עם משתמשים אחרים


אפליקציית IssieDice מתאימה גם למי שמתקשה להשתמש בקוביות פיזיות, גם למי שמחפש פתרון מהיר כשאין קובייה בסביבה, וגם לכל מי שאוהב ליצור משחקים מקוריים משלו.
`,
    en: `
# About IssieDice
The IssieDice app was created out of a real need to make board games and classroom activities accessible to all users – including children and adults with disabilities. It enables easy creation and use of personalized digital dice, directly on the iPad screen.

The app was developed by the Technology Center at Beit Issie Shapiro in collaboration with volunteers from SAP Labs Israel, as part of a series of innovative assistive technology applications.

## In the new version of IssieDice:
- Create custom dice with: voice recordings, text, background images from the camera or online search
- Support for up to 4 different dice in a game
- Create and manage personal profiles
- Share profiles and dice with other users

IssieDice is perfect for those who have difficulty using physical dice, for anyone who needs a quick solution when dice are missing, and for everyone who enjoys creating their own original games.

`, ar: `
# حول IssieDice

تطبيق IssieDice وُلِد من حاجة حقيقية لجعل ألعاب الطاولة والأنشطة الصفية متاحة للجميع – بما في ذلك الأطفال والبالغين من ذوي الإعاقات. يتيح التطبيق إنشاء واستخدام نردات رقمية مخصصة بسهولة، مباشرة على شاشة الـ iPad.

تم تطوير التطبيق من قبل المركز التكنولوجي في بيت إيزي شبيرا، بالتعاون مع متطوعين من مختبرات SAP في إسرائيل، وذلك كجزء من سلسلة تطبيقات مبتكرة في مجال التكنولوجيا المساعدة.

## في الإصدار الجديد من IssieDice:
- إنشاء نردات مخصصة تحتوي على: تسجيلات صوتية، نصوص، خلفيات مخصصة من الكاميرا أو من بحث عبر الإنترنت
- دعم حتى ٤ نردات مختلفة في اللعبة
- إنشاء وإدارة ملفات تعريف شخصية
- مشاركة الملفات التعريفية والنردات مع مستخدمين آخرين

تطبيق IssieDice مثالي للأشخاص الذين يواجهون صعوبة في استخدام النردات التقليدية، ولمن يحتاج إلى حل سريع عند عدم توفر نرد، ولكل من يحب ابتكار ألعاب خاصة به.
`
}


export function About({ onClose }: { onClose: () => void }) {
    return <View style={{ backgroundColor: "lightgray", height: "100%", zIndex: 9999, }}>
        <View style={{ position: "absolute", top: 30, right: 10 }}>
            <Icon name="close" color='black' size={40} onPress={(e) => onClose()} />
        </View>

        <ScrollView style={{ margin: 30, marginTop: 50, width: "90%" }} contentContainerStyle={{ justifyContent: "center" }}>
            {loadAbout()}
        </ScrollView>

    </View >
}

function loadAbout() {
    const text = about[gCurrentLang];
    if (!text) return null;

    const lines = text.trim().split("\n");

    return lines.map((line, index) => {
        line = line.trim();

        if (line.startsWith("# ")) {
            return (
                <Text key={index} style={[styles.heading1, isRTL() ? styles.textHE : styles.textEN]}>
                    {line.replace(/^# /, '')}
                </Text>
            );
        }

        if (line.startsWith("## ")) {
            return (
                <Text key={index} style={[styles.heading2, isRTL() ? styles.textHE : styles.textEN]}>
                    {line.replace(/^## /, '')}
                </Text>
            );
        }

        if (line.startsWith("- ")) {
            return (
                <Text key={index} style={[styles.bullet, isRTL() ? styles.textHE : styles.textEN]}>{parseBold(line)}</Text>
            );
        }

        if (line === "") {
            return <Text key={index} style={{ height: 10 }} />;
        }

        return (
            <Text key={index} style={[styles.paragraph, isRTL() ? styles.textHE : styles.textEN]}>
                {parseBold(line)}
            </Text>
        );
    });
}


function isRTL() {
    return gCurrentLang === 'he' || gCurrentLang === 'ar';
}

function parseBold(text: string) {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith("*") && part.endsWith("*")) {
            return <Text key={index} style={{ fontWeight: "bold" }}>{part.slice(1, -1)}</Text>;
        }
        return <Text key={index}>{part}</Text>;
    });
}


const styles = StyleSheet.create({
    textHE: {
        width: "100%",
        alignSelf: 'flex-start',
        textAlign: 'right'
    },
    textEN: {
        width: "100%",
        alignSelf: 'flex-start',
        writingDirection: "ltr",
        textAlign: 'left'
    },
    heading1: {
        fontSize: 28,
        fontWeight: "bold",
        marginTop: 20
    },
    heading2: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 15
    },
    bullet: {
        fontSize: 18,
        paddingLeft: 10,
        paddingRight: 10,
        marginTop: 5
    },
    paragraph: {
        fontSize: 18,
        marginTop: 10
    }
})