import { ScrollView, StyleSheet, Text, View } from "react-native";
import { gCurrentLang, translate } from "./lang";
import { colors, gStyles } from "./common-style";
import { getInsetsLimit, ScreenTitle } from "./components";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Linking } from "react-native";


const about = {
    he: `
# אודות IssieDice
אפליקציית IssieDice נולדה מתוך צורך אמיתי להנגיש משחקי קופסא ופעילויות כיתתיות לכלל המשתמשים – כולל ילדים ובוגרים עם מוגבלויות. היא מאפשרת ליצור ולשחק בקוביות דיגיטליות ובסביבון מותאמים אישית בקלות, ישירות על המסך שלכם (אייפד או אנדרויד).

האפליקציה פותחה על ידי המרכז הטכנולוגי בבית איזי שפירא בשיתוף מתנדבים ממעבדות SAP ישראל, כחלק מסדרת אפליקציות חדשניות להנגשה וטכנולוגיה מסייעת.

## מה אפשר לעשות באפליקציה:
- לשחק עם עד 4 קוביות שונות במשחק
- לשחק עם סביבון – מסתובב, מאט ונופל על אחת מארבע הפאות שלו
- להשתמש בתבניות מוכנות: נקודות, מספרים, צבעים, ולסביבון גם תבנית חנוכה (נ ג ה פ)
- ליצור קוביות וסביבונים מותאמים אישית עם: הקלטות קוליות, טקסטים, תמונות (שצולמו או שמורות בגלריה) או מספריית סמלים מובנית
- ליצור ולנהל פרופילים אישיים
- לשתף פרופילים, קוביות וסביבונים עם משתמשים אחרים

## הגדרות כלליות להתאמה אישית:
- "זמן התאוששות" בו המסך יהיה נעול ללחיצות חדשות לאחר הטלת הקוביות או סיבוב הסביבון (קיימת אפשרות לנטרל לפי הצורך בלחיצה על כפתור המנעול שנמצא באחת הפינות על המסך משחק)
- קוביות או סביבון
- צבע הרקע
- גודל הקוביות או הסביבון
- כיבוי והדלקת הצליל

IssieDice מתאימה למגוון צרכים כולל: מי שמתקשה להשתמש בקוביות או בסביבון פיזיים, מי שמחפש פתרון מהיר כשאין קובייה או סביבון בסביבה, ולכל מי שאוהב ליצור משחקים. היא מתאימה לשימוש בכיתה וגם בבית.

[לאתר המרכז הטכנולוגי בבית איזי שפירא](https://beitissie.org.il/%d7%98%d7%99%d7%a4%d7%95%d7%9c-%d7%a9%d7%99%d7%a7%d7%95%d7%9d-%d7%95%d7%a4%d7%a0%d7%90%d7%99/%d7%94%d7%9e%d7%a8%d7%9b%d7%96-%d7%94%d7%98%d7%9b%d7%a0%d7%95%d7%9c%d7%95%d7%92%d7%99/)
`,
    en: `
# About IssieDice

The IssieDice app was created out of a real need to make board games and classroom activities accessible to all users – including children and adults with disabilities. It allows for easy creation and use of personalized digital dice and a spinner (dreidel), directly on your screen (iPad or Android).

The app was developed by the Technology Center at Beit Issie Shapiro in collaboration with volunteers from SAP Labs Israel, as part of a series of innovative assistive technology applications.

## What you can do:
- Play with up to 4 different dice in a game
- Play with a spinner (dreidel) – it spins, slows down and falls on one of its four sides
- Use ready-made templates: dots, numbers, colors, and for the spinner also a Hanukkah template (נ ג ה פ)
- Create custom dice and spinners with: voice recordings, text, images (taken with the camera or from the gallery), or from a built-in symbol library
- Create and manage personal profiles
- Share profiles, dice and spinners with other users

## General customization settings:
- "Recovery time" – a delay during which the screen is locked to new taps after rolling the dice or spinning the spinner (can be disabled if needed by tapping the lock icon in one of the game screen corners)  
- Dice or spinner
- Background color
- Dice or spinner size
- Toggle sound on/off

IssieDice is suitable for a variety of needs including: those who have difficulty using physical dice or spinners, anyone looking for a quick solution when no dice or spinner is available, and anyone who enjoys creating games. It's ideal for both classroom and home use.

[The Technology Center at Beit Issie Shapiro](https://beitissie.org.il/en/assistive-technology/)
`, ar: `
# حول IssieDice

تطبيق IssieDice وُلِد من حاجة حقيقية لجعل ألعاب الطاولة والأنشطة الصفية متاحة لجميع المستخدمين – بما في ذلك الأطفال والبالغين من ذوي الإعاقات. يتيح التطبيق إنشاء واستخدام نردات رقمية ودوّامة مخصصة بسهولة، مباشرة على شاشتك (iPad أو Android).

تم تطوير التطبيق من قبل المركز التكنولوجي في بيت إيزي شبيرا، بالتعاون مع متطوعين من مختبرات SAP في إسرائيل، كجزء من سلسلة تطبيقات مبتكرة في مجال التكنولوجيا المساعدة.

## ما يمكنك فعله:
- اللعب بما يصل إلى 4 نردات مختلفة في اللعبة
- اللعب بدوّامة – تدور، ثم تتباطأ وتسقط على أحد جوانبها الأربعة
- استخدام قوالب جاهزة: نقاط، أرقام، ألوان، وللدوّامة أيضًا قالب حانوكا (נ ג ה פ)
- إنشاء نردات ودوّامات مخصصة تحتوي على: تسجيلات صوتية، نصوص، صور (مأخوذة بالكاميرا أو من المعرض)، أو من مكتبة رموز مدمجة
- إنشاء وإدارة ملفات تعريف شخصية
- مشاركة الملفات التعريفية والنردات والدوّامات مع مستخدمين آخرين

## إعدادات عامة للتخصيص:
- "زمن الاستعادة" – فترة يتم فيها قفل الشاشة مؤقتًا بعد رمي النرد أو تدوير الدوّامة (يمكن تعطيلها إذا لزم الأمر من خلال النقر على أيقونة القفل في أحد زوايا شاشة اللعبة)  
- نرد أو دوّامة
- لون الخلفية
- حجم النرد أو الدوّامة
- تشغيل/إيقاف الصوت

تطبيق IssieDice مناسب لمجموعة متنوعة من الاحتياجات، بما في ذلك: من يواجهون صعوبة في استخدام النردات أو الدوّامات الفعلية، من يبحثون عن حل سريع عند عدم توفر نرد أو دوّامة، وكل من يحب ابتكار ألعاب خاصة به. التطبيق مناسب للاستخدام في الصف وأيضًا في المنزل.

[لموقع المركز التكنولوجي في بيت إيزي شبيرا](https://beitissie.org.il/en/assistive-technology/)
`
}


export function About({ onClose }: { onClose: () => void }) {
    const insets = useSafeAreaInsets();

    return <View style={[gStyles.screenContainer, getInsetsLimit(insets)]}>
        <ScreenTitle title={translate("About")} onClose={() => onClose()} icon={{ name: "close", type: "MDI", size: 30, color: colors.titleBlue }} />

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
                <Text key={index} style={[styles.bullet, isRTL() ? styles.textHE : styles.textEN]}>{parseBoldAndLinks(line)}</Text>
            );
        }

        if (line === "") {
            return <Text key={index} style={{ height: 10 }} />;
        }

        return (
            <Text key={index} style={[styles.paragraph, isRTL() ? styles.textHE : styles.textEN]}>
                {parseBoldAndLinks(line)}
            </Text>
        );
    });
}


function isRTL() {
    return gCurrentLang === 'he' || gCurrentLang === 'ar';
}


function parseBoldAndLinks(text: string) {
    // First, split by bold
    const boldParts = text.split(/(\*[^*]+\*)/g);

    return boldParts.map((part, index) => {
        if (part.startsWith("*") && part.endsWith("*")) {
            return (
                <Text key={`b-${index}`} style={{ fontWeight: "bold" }}>
                    {part.slice(1, -1)}
                </Text>
            );
        }

        // Inside normal text, look for [text](link)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const segments: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(part)) !== null) {
            const [fullMatch, linkText, url] = match;
            const start = match.index;

            if (start > lastIndex) {
                segments.push(part.slice(lastIndex, start));
            }

            segments.push(
                <Text
                    key={`l-${index}-${start}`}
                    style={{ color: 'blue', textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL(url)}
                >
                    {linkText}
                </Text>
            );

            lastIndex = start + fullMatch.length;
        }

        if (lastIndex < part.length) {
            segments.push(part.slice(lastIndex));
        }

        return <Text key={`t-${index}`}>{segments}</Text>;
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