import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fTranslate, isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import { IconButton, NumberSelector, Spacer } from "./components";
import { useEffect, useState } from "react";
import { AlreadyExists, deleteDice, deleteProfile, Dice, EmptyProfile, exportAll, exportDice, exportProfile, Folders, InvalidCharachters, InvalidFileName, isValidFilename, LoadProfile, Profile, readCurrentProfile, renameProfile, SaveProfile, SettingsKeys, Templates, verifyProfileNameFree } from "./profile";
import { Settings } from "./setting-storage";
import { DiceSettings } from "./dice-settings";
import { DiePicker, ProfilePicker } from "./profile-picker";
import { EditDice } from "./edit-dice";
import { MyColorPicker } from "./color-picker";
import { Alert } from "react-native";
import prompt from "react-native-prompt-android";
import Toast from "react-native-toast-message";
import Share from 'react-native-share';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeColor } from "./utils";

export const BTN_COLOR = "#6E6E6E";
const disabledColor = "gray";


interface SettingsProp {
    windowSize: { width: number, height: number };
    onChange: () => void;
    onClose: () => void;
}

export function SettingsUI({ windowSize, onChange, onClose }: SettingsProp) {
    const [revision, setRevision] = useState<number>(0);
    const [openLoadProfile, setOpenLoadProfile] = useState<boolean>(false);
    const [openColorPicker, setOpenColorPicker] = useState<boolean>(false);
    const [editOrCreateDice, setEditOrCreateDice] = useState<string | undefined>(undefined)
    const [profileBusy, setProfileBusy] = useState<boolean>(false);
    const [diceBusy, setDiceBusy] = useState<number>(-1);
    const [busy, setBusy] = useState<boolean>(false);
    const [openSelectTemplate, setOpenSelectTemplate] = useState<number>(-1);

    const insets = useSafeAreaInsets();


    const [profileName, setProfileName] = useState<string>("");
    const [profile, setProfile] = useState<Profile>(EmptyProfile);

    useEffect(() => {
        readCurrentProfile().then(p => {
            setProfile(p);
            setProfileName(Settings.getString(SettingsKeys.CurrentProfileName, ""));
            console.log("reload settings", p.dice.map(b => b.template))

            onChange()
        });
    }, [revision]);


    function changeNumOfButton(delta: number) {
        const current = Settings.getNumber(SettingsKeys.DiceCount, 1);
        let newVal = current + delta;
        if (newVal < 1) return;
        if (newVal > 4) return;
        Settings.set(SettingsKeys.DiceCount, newVal);
        setRevision(old => old + 1);
    }

    function setDiceActive(index: number, newVal: boolean) {
        let newDiceActive = profile.dice.map(b => b.active);
        newDiceActive[index] = newVal
        Settings.setArray(SettingsKeys.DiceActive, newDiceActive);
        setRevision(old => old + 1);
    }

    function handleSetSize(newSize: number) {
        Settings.set(SettingsKeys.DiceSize, newSize);
        setRevision(old => old + 1);
    }

    function handleSetRecoveryTime(newRecoveryTime: number) {
        Settings.set(SettingsKeys.RecoveryTime, newRecoveryTime);
        setRevision(old => old + 1);
    }

    function handleSetTableColor(newColor: string) {
        Settings.set(SettingsKeys.TableColor, newColor);
        setRevision(old => old + 1);
    }

    function setDiceTemplate(index: number, newTemplate: Templates) {
        let newDiceTemplates = profile.dice.map(b => b.template);
        newDiceTemplates[index] = newTemplate as Templates;
        Settings.setArray(SettingsKeys.DiceTemplates, newDiceTemplates);
        setRevision(old => old + 1);
    }

    /* Profile actions */
    const doProfileSave = async (name: string, previousName: string, isCurrent: boolean, overwrite = false) => {
        console.log("doProfileSave")
        if (!isValidFilename(name)) {
            throw new InvalidFileName(name);
        }
        if (previousName == "") {
            // new profile
            if (!overwrite) {
                return verifyProfileNameFree(name).then(async () => {
                    const currentProfile = await readCurrentProfile();
                    await SaveProfile(name, currentProfile, true);
                    Settings.set(SettingsKeys.CurrentProfileName, name);
                });
            } else {
                Settings.set(SettingsKeys.CurrentProfileName, name);
            }
            setRevision(prev => prev + 1);
        } else {
            // rename profile
            return renameProfile(previousName, name).then(() => {
                if (isCurrent) {
                    Settings.set(SettingsKeys.CurrentProfileName, name);
                    setRevision(prev => prev + 1);
                }
            })
        }
    }

    const handleProfileDelete = async (name: string, afterDelete: () => void, force = false) => {
        const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
        const isCurrent = name == currName;

        if (!force) {
            const msg = isCurrent ?
                fTranslate("DeleteCurrentProfileWarnning", name) :
                fTranslate("DeleteProfileWarnning", name);

            Alert.alert(translate("DeleteProfileTitle"), msg, [
                { text: translate("Cancel"), style: "cancel" },
                { text: translate("Delete"), style: "destructive", onPress: () => handleProfileDelete(name, afterDelete, true) }
            ]);
            return;
        }

        if (isCurrent) {
            await LoadProfile("");
            setTimeout(() => setRevision(prev => prev + 1), 100);
        }
        await deleteProfile(name);
        afterDelete();
    }

    const handleProfileEditName = (name: string, isRename: boolean, afterSave: () => void) => {
        const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
        const isCurrent = currName == name;
        prompt(isRename ? translate("RenameProfile") : translate("SetProfileName"), undefined, [
            { text: translate("Cancel"), style: "cancel" },
            {
                text: translate("Save"),
                onPress: (newName) => {
                    console.log("save pressed", newName)
                    if (newName) {
                        doProfileSave(newName, name, isCurrent)
                            .then(() => {
                                afterSave();
                                Toast.show({
                                    autoHide: true,
                                    type: 'success',
                                    text1: translate(isRename ? "ProfileSuccessRenamed" : "ProfileSuccessfulyCreated")
                                })
                            })
                            .catch((err) => {
                                if (err instanceof AlreadyExists) {
                                    Alert.alert(translate("ProfileExistsTitle"), fTranslate("ProfileExists", name),
                                        [
                                            {
                                                text: translate("Overwrite"), onPress: () => {
                                                    doProfileSave(newName, name, isCurrent, true).then(() => {
                                                        afterSave();
                                                        Toast.show({
                                                            autoHide: true,
                                                            type: 'success',
                                                            text1: translate(isRename ? "ProfileSuccessRenamed" : "ProfileSuccessfulyCreated")
                                                        })
                                                    })
                                                }
                                            },
                                            { text: translate("Cancel") }
                                        ])
                                } else if (err instanceof InvalidFileName) {
                                    Alert.alert(fTranslate("InvalidName", InvalidCharachters));
                                } else {
                                    Toast.show({
                                        autoHide: true,
                                        type: 'error',
                                        text1: translate(translate("ProfileSaveFailed"))
                                    })
                                }
                            });
                    }
                }
            },
        ], { type: 'plain-text', defaultValue: name });
    }

    const closeProfile = async () => {
        const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
        if (currName.length > 0) {
            await LoadProfile("");
            setTimeout(() => setRevision(prev => prev + 1), 100);
        }
    }

    let marginHorizontal = {}
    if (windowSize.width < 450) {
        marginHorizontal = { marginHorizontal: 5 };
    }
    const isScreenNarrow = windowSize.width < 500;
    const onAbout = () => {
        // todo
    }

    async function handleExportDice(name: string) {
        setBusy(true)
        const zipPath = await exportDice(name)
            .finally(() => setBusy(false));


        const shareOptions = {
            title: translate("ShareDiceWithTitle"),
            subject: translate("ShareDiceEmailSubject"),
            urls: [zipPath],
        };

        Share.open(shareOptions).then(() => {
            Alert.alert(translate("ShareSuccessful"));
        }).catch(err => {
            Alert.alert(translate("ActionCancelled"));
        });
    }

    async function handleExportProfile(name: string) {
        setBusy(true)
        const zipPath = (await exportProfile(name, [], true)
            .finally(() => setBusy(false))
        ) as string;

        const shareOptions = {
            title: translate("ShareProfileWithTitle"),
            subject: translate("ShareProfileEmailSubject"),
            urls: [zipPath],
        };

        Share.open(shareOptions).then(() => {
            Alert.alert(translate("ShareSuccessful"));
        }).catch(err => {
            Alert.alert(translate("ActionCancelled"));
        });
    }

    async function handleBackupAll() {
        setBusy(true)
        const zipPath = (await exportAll()
            .finally(() => setBusy(false))
        ) as string;
        const shareOptions = {
            title: translate("ShareBackupWithTitle"),
            subject: translate("ShareBackupEmailSubject"),
            urls: [zipPath],
        };

        Share.open(shareOptions).then(() => {
            Alert.alert(translate("ShareSuccessful"));
        }).catch(err => {
            Alert.alert(translate("ActionCancelled"));
        });
    }


    const sectionStyle = [styles.section, marginHorizontal, { flexDirection: (isRTL() ? "row" : "row-reverse") }]

    function handleDeleteDie(name: string, afterDelete: () => void): void {
        Alert.alert(translate("DeleteDieTitle"), translate("DeleteDieAlert"),[
            {text:translate("Delete"), onPress:()=>{
                deleteDice(name);
                setRevision(prev => prev + 1);
                afterDelete()
            }},
            {text:translate("Cancel"), onPress:()=>{}}
        ])
        
    }

    return <View style={[styles.container, { top: insets.top }]}>
        {busy && <ActivityIndicator size={"large"} style={styles.busy} />}

        {/** Profile Picker */}
        <ProfilePicker
            folder={Folders.Profiles}
            open={openLoadProfile}
            loadButton={{ name: translate("Load"), icon: "upload" }}
            exportButton={{ name: translate("Export") }}
            height={windowSize.height * .6}
            onSelect={async (profileName) => {
                console.log("select profile", profileName)
                setProfileBusy(true);
                LoadProfile(profileName)
                    .then(() => setRevision(prev => prev + 1))
                    .finally(() => setProfileBusy(false));
                setOpenLoadProfile(false);

            }}
            editButton={{ name: translate("Rename") }}
            onEdit={(name, afterSave) => handleProfileEditName(name, true, afterSave)}
            onClose={() => setOpenLoadProfile(false)}
            onExport={handleExportProfile}
            isNarrow={isScreenNarrow}
        />


        {/** Cube Picker */}
        <DiePicker
            open={openSelectTemplate > -1}
            height={windowSize.height * .6}
            onSelect={async (template) => {
                setDiceTemplate(openSelectTemplate, template as Templates);
                setOpenSelectTemplate(-1);
                setRevision(prev => prev + 1);
            }}
            onEdit={(template) => {
                setOpenSelectTemplate(-1);
                setEditOrCreateDice(template);
            }}
            onClose={() => setOpenSelectTemplate(-1)}
            onCreate={() => {
                setOpenSelectTemplate(-1);
                setEditOrCreateDice("")
            }}
            onExport={handleExportDice}
            onDelete={(name, afterDelete)=>handleDeleteDie(name, afterDelete) }
            currentDie={openSelectTemplate>=0 ? profile.dice[openSelectTemplate].template : Templates.Dots}
        />

        <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={profile.tableColor}
            height={300} width={windowSize.width} isScreenNarrow={true} onClose={() => setOpenColorPicker(false)}
            onSelect={(color) => {
                handleSetTableColor(color);
                setOpenColorPicker(false);
            }} open={openColorPicker}
        />

        {editOrCreateDice != undefined && <EditDice
            name={editOrCreateDice}
            windowSize={windowSize}
            onClose={() => {
                // todo rename cube
                setEditOrCreateDice(undefined)
                setRevision(prev => prev + 1)
            }} />}

        {/** Title */}
        <View style={styles.settingTitle}>
            <Spacer w={35} />
            <Text allowFontScaling={false} style={styles.settingTitleText}>{translate("Settings")}</Text>
            <Icon name={"close"} color={"black"} size={35} onPress={onClose} />
        </View>

        <ScrollView style={styles.settingHost}>
            {/** About */}
            <TouchableOpacity style={sectionStyle} onPress={() => onAbout()}>
                <Icon name="infocirlceo" color={BTN_COLOR} size={35} />
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("About")}</Text>
            </TouchableOpacity>


            {/* Profile Name */}
            <View style={sectionStyle} >
                <View style={{ flexDirection: isRTL() ? "row-reverse" : "row" }}>
                    {profileBusy && <ActivityIndicator color="#0000ff" size="large" />}
                    <IconButton text={translate("List")} onPress={() => setOpenLoadProfile(true)} />
                    {profileName.length > 0 ?
                        <IconButton text={translate("Close")} onPress={closeProfile} /> :
                        <IconButton text={translate("Create")} onPress={() => handleProfileEditName("", false, () => setRevision(prev => prev + 1))} />
                    }
                </View>
                <View style={{ flexDirection: isRTL() ? "row-reverse" : "row" }}>
                    <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("ProfileName")}:</Text>
                    <Text allowFontScaling={false} style={[styles.textValue, { textAlign: isRTL() ? "right" : "left" },
                    { color: profileName.length == 0 ? disabledColor : styles.textValue.color }]}>
                        {profileName.length > 0 ? profileName : translate("ProfileNoName")}
                    </Text>
                </View>
            </View>


            {/* Recovery time */}
            <NumberSelector style={sectionStyle} title={translate("RecoveryTime")} min={0} max={45} value={profile.recoveryTime}
                onUp={() => handleSetRecoveryTime(profile.recoveryTime + 5)} onDown={() => handleSetRecoveryTime(profile.recoveryTime - 5)}
                titleStyle={styles.sectionTitle} />


            {/* Table Color */}
            <View style={sectionStyle}>
                <View style={{ flexDirection: "row" }}>
                    <View style={[styles.colorCircle, { backgroundColor: safeColor(profile.tableColor) }]} onTouchEnd={() => setOpenColorPicker(true)} />
                    {/* <IconButton text={translate("Change")} onPress={() => setOpenColorPicker(true)} /> */}
                </View>
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("TableColor")}:</Text>
            </View>

            {/* Dice Size */}
            <NumberSelector style={sectionStyle} title={translate("DiceSize")} min={1} max={7} value={profile.size}
                onUp={() => handleSetSize(profile.size + 1)} onDown={() => handleSetSize(profile.size - 1)} titleStyle={styles.sectionTitle} />

            {/* Number of Dice */}
            <NumberSelector style={sectionStyle} title={translate("NumberOfDice")} min={1} max={4} value={profile.dice.length}
                onUp={() => changeNumOfButton(1)} onDown={() => changeNumOfButton(-1)} titleStyle={styles.sectionTitle} />

            <View style={[styles.cubes, marginHorizontal]}>
                {
                    Array.from(Array(profile.dice.length).keys()).map((i: any) => (
                        <DiceSettings
                            sectionStyle={sectionStyle}
                            key={i}
                            dice={revision >= 0 ? profile.dice[i] : undefined}
                            isBusy={diceBusy == i}
                            onSetActive={(newVal) => setDiceActive(i, newVal)}
                            onOpenLoadDice={() => setOpenSelectTemplate(i)
                            }
                            onSaveDice={() => { }} //handleSaveButton(profile.buttons[i].name, i)}
                            onImageSearchOpen={() => { }}//setImageSearchOpen(i)}
                            onSelectTemplate={() => setOpenSelectTemplate(i)}
                            onEditName={() => { }}//handleButtonEditName(i)}
                            isLast={i == profile.dice.length - 1}
                            isScreenNarrow={isScreenNarrow}
                        />

                    ))
                }
            </View>

            {/* Backup Color */}
            <View style={sectionStyle}>
                <View style={{ flexDirection: "row" }}>
                    <IconButton text={translate("BackupAll")} onPress={handleBackupAll} />
                </View>
                <Text allowFontScaling={false} style={styles.sectionTitle}>{translate("Backup")}:</Text>
            </View>


        </ScrollView >
    </View >
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
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
    textValue: {
        marginEnd: 10,
        marginStart: 10,
        fontSize: 20,
        color: "black"
    },
    colorCircle: {
        width: 40, height: 40,
        borderRadius: 20,
        marginEnd: 20,
    },
    cubes: {
        backgroundColor: "white",
        padding: 20,
        flexDirection: "column",
        alignItems: "center",
        borderRadius: 45,
        marginTop: 15,
        marginHorizontal: 40,
        height: "auto"
    },
    busy: {
        position: "absolute",
        left: "45%", height: "45%",
        zIndex: 1000
    }
});