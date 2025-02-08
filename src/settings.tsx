import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { IconButton } from "./components";
import { useEffect, useState } from "react";
import { Profile, readCurrentProfile, SettingsKeys } from "./profile";
import { Settings } from "./setting-storage";
// import IconIonic from 'react-native-vector-icons/Ionicons';

// import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
// import IconMI from 'react-native-vector-icons/MaterialIcons';

export const BTN_COLOR = "#6E6E6E";
const disabledColor = "gray";

const BTN_FOR_COLOR = "#CD6438";


interface SettingsProp {
    windowSize: { width: number, height: number }
    onChange: ()=>void,
}

export function SettingsUI({ windowSize, onChange }: SettingsProp) {
    const [revision, setRevision] = useState<number>(0);
    const [openLoadProfile, setOpenLoadProfile] = useState<boolean>(false);
    const [profileBusy, setProfileBusy] = useState<boolean>(false);
    const [profileName, setProfileName] = useState<string>("");
    const [profile, setProfile] = useState<Profile>(readCurrentProfile());

    useEffect(() => {
        const p = readCurrentProfile();
        setProfile(p);
        setProfileName(Settings.getString(SettingsKeys.CurrentProfileName, ""));
        console.log("reload settings", p.dice.map(b => b.name))

        onChange()
    }, [revision]);


    function closeProfile() { }
    function saveAsNewProfile() { }
    function changeNumOfButton(delta: number) {
        const current = Settings.getNumber(SettingsKeys.DiceCount, 1);
        let newVal = current + delta;
        if (newVal < 1) return;
        if (newVal > 4) return;
        Settings.set(SettingsKeys.DiceCount, newVal);
        setRevision(old => old + 1);
    }

    let marginHorizontal = {}
    if (windowSize.width < 450) {
        marginHorizontal = { marginHorizontal: 5 };
    }
    const isScreenNarrow = windowSize.width < 500;
    const dirStyle: any = { flexDirection: (isRTL() ? "row" : "row-reverse") }
    const onAbout = () => { }

    return <View style={styles.container}>

        {/** Title */}
        <View style={styles.settingTitle}>
            <Text allowFontScaling={false} style={styles.settingTitleText}>{translate("Settings")}</Text>
        </View>

        <ScrollView style={styles.settingHost}>
            {/** About */}
            <TouchableOpacity style={[styles.section, marginHorizontal, dirStyle]} onPress={() => onAbout()}>
                <Icon name="infocirlceo" color={BTN_COLOR} size={35} />
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("About")}</Text>
            </TouchableOpacity>


            {/* Profile Name */}
            <View style={[styles.section, marginHorizontal, isScreenNarrow ? {
                flexDirection: "column-reverse", alignItems: "flex-start", height: 90,
            } : dirStyle]} >
                <View style={{ flexDirection: isRTL() ? "row-reverse" : "row" }}>
                    {profileBusy && <ActivityIndicator color="#0000ff" size="large" />}
                    <IconButton text={translate("Load")} onPress={() => setOpenLoadProfile(true)} />
                    {profileName.length > 0 ?
                        <IconButton text={translate("Close")} onPress={() => closeProfile()} /> :
                        <IconButton text={translate("Create")} onPress={() => saveAsNewProfile()} />
                    }
                </View>
                <View style={{ flexDirection: isRTL() ? "row-reverse" : "row" }}>
                    <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("ProfileName")}:</Text>
                    <Text allowFontScaling={false} style={{
                        marginEnd: 10, marginStart: 10, fontSize: 20,
                        textAlign: isRTL() ? "right" : "left",
                        color: profileName.length == 0 ? disabledColor : "black"
                    }}>
                        {profileName.length > 0 ? profileName : translate("ProfileNoName")}
                    </Text>
                </View>
            </View>

            {/* Number of Dice */}
            <View style={[styles.section, marginHorizontal, dirStyle]} >
                <View style={styles.numberSelector}>
                    <Icon name="minuscircleo" color={profile.dice.length == 1 ? "lightgray" : BTN_COLOR} size={35} onPress={() => changeNumOfButton(-1)} />
                    <Text allowFontScaling={false} style={{ fontSize: 30, marginHorizontal: 10 }}>{revision >= 0 && profile.dice.length}</Text>
                    <Icon name="pluscircleo" color={profile.dice.length == 4 ? "lightgray" : BTN_COLOR} size={35} onPress={() => changeNumOfButton(1)} />
                </View>
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("Dice")}</Text>
            </View>

        </ScrollView>
    </View>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        backgroundColor: "gray",
        zIndex: 800
    },
    settingTitle: {
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 80,
        fontSize: 25,
        borderRadius: 5,
        margin: 10
    },
    settingTitleText: {
        fontSize: 35,
    },
    settingHost: {
        width: "100%",
        flex: 1,
        backgroundColor: "#F5F5F5",
        position: "relative"
    },
    section: {
        backgroundColor: "white",
        height: 60,
        padding: 8,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 45,
        marginTop: 10,
        marginHorizontal: 40
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0D3D63",
    },
    numberSelector: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: "100%"
    },
});