import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fTranslate, isRTL, translate } from "./lang";
import Icon from 'react-native-vector-icons/AntDesign';
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';
import IconIonicons from 'react-native-vector-icons/Ionicons';

import { IconButton, NumberSelector, ScreenTitle, Section, Spacer } from "./components";
import { useEffect, useState } from "react";
import { deleteDice, deleteProfileFile, getCurrentProfile, isValidFilename, LoadProfileFileIntoSettings, renameProfileFile, saveProfileFile, verifyProfileNameFree } from "./profile";
import { Settings } from "./setting-storage";
import { DiceSettings } from "./dice-settings";
import { DiePicker, ProfilePicker } from "./profile-picker";
import { EditDice } from "./edit-dice";
import { MyColorPicker } from "./color-picker";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import Share from 'react-native-share';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeColor } from "./utils";
import { EditText } from "./edit-text";
import { AlreadyExists, Folders, InvalidCharachters, InvalidFileName } from "./disk";
import { EmptyDice, EmptyProfile, isStaticDie, Profile, Templates } from "./models";
import { SettingsKeys } from "./settings-storage";
import { exportAll, exportDice, exportProfile } from "./import-export";
import { colors, gStyles } from "./common-style";
import { Switch } from "@rneui/themed";
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
    const [editOrCreateDice, setEditOrCreateDice] = useState<string | undefined>(undefined);
    const [setDieAfterCreate, setSetDieAfterCreate] = useState<number>(-1);
    const [profileBusy, setProfileBusy] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [openSelectTemplate, setOpenSelectTemplate] = useState<number>(-1);
    const [showEditProfileName, setShowEditProfileName] = useState<{ name: string, afterSave?: () => void } | undefined>(undefined);

    const insets = useSafeAreaInsets();


    const [profileName, setProfileName] = useState<string>("");
    const [profile, setProfile] = useState<Profile>(EmptyProfile);

    useEffect(() => {
        getCurrentProfile().then(p => {
            setProfile(p);
            setProfileName(Settings.getString(SettingsKeys.CurrentProfileName, ""));
            console.log("reload settings", p.dice.map(b => b.template))
            if (revision > 0) {
                onChange()
            }
        });
    }, [revision]);


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
        if (newRecoveryTime < 0) {
            newRecoveryTime = 0;
        }
        Settings.set(SettingsKeys.RecoveryTime, newRecoveryTime);
        setRevision(old => old + 1);
    }

    function handleSetTableColor(newColor: string) {
        Settings.set(SettingsKeys.TableColor, newColor);
        setRevision(old => old + 1);
    }

    function handleSetSoundEnabled(newEnabled: boolean) {
        Settings.set(SettingsKeys.SoundEnabled, newEnabled);
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
                    const currentProfile = await getCurrentProfile();
                    await saveProfileFile(name, currentProfile, true);
                    Settings.set(SettingsKeys.CurrentProfileName, name);
                });
            } else {
                Settings.set(SettingsKeys.CurrentProfileName, name);
            }
            setRevision(prev => prev + 1);
        } else {
            // rename profile
            return renameProfileFile(previousName, name).then(() => {
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
            await LoadProfileFileIntoSettings("");
            setTimeout(() => setRevision(prev => prev + 1), 100);
        }
        await deleteProfileFile(name);
        afterDelete();
    }


    const handleProfileEditName = (newName: string, prevName: string, afterSave?: () => void) => {
        const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
        const isCurrent = currName == newName;
        const isRename = prevName.length > 0;

        console.log("save pressed", newName)
        if (newName) {
            doProfileSave(newName, prevName, isCurrent)
                .then(() => {
                    afterSave?.();
                    Toast.show({
                        autoHide: true,
                        type: 'success',
                        text1: translate(isRename ? "ProfileSuccessRenamed" : "ProfileSuccessfulyCreated")
                    })
                })
                .catch((err) => {
                    if (err instanceof AlreadyExists) {
                        Alert.alert(translate("ProfileExistsTitle"), fTranslate("ProfileExists", newName),
                            [
                                {
                                    text: translate("Overwrite"), onPress: () => {
                                        doProfileSave(newName, newName, isCurrent, true).then(() => {
                                            afterSave?.();
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

    const closeProfile = async () => {
        const currName = Settings.getString(SettingsKeys.CurrentProfileName, "");
        if (currName.length > 0) {
            await LoadProfileFileIntoSettings("");
            setTimeout(() => setRevision(prev => prev + 1), 100);
        }
    }



    const isScreenNarrow = windowSize.width < 500;
    const isMobile = isScreenNarrow || windowSize.height < 500;
    let diceInRow = windowSize.width > windowSize.height ? 4 : 2;
    const marginHorizontal = isScreenNarrow ? 5 : 40;
    const cubeSettingSize = Math.max((windowSize.width - insets.left - insets.right - 2 * marginHorizontal) / diceInRow - 10, 150)
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
            .catch(err => console.log("export all failed", err))
            .finally(() => setBusy(false))
        ) as string;

        console.log("Export All", zipPath)
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





    function handleDeleteProfile(name: string, afterDelete: () => void): void {
        Alert.alert(translate("DeleteProfileTitle"), fTranslate("DeleteProfileAlert", name), [
            {
                text: translate("Delete"), onPress: () => {
                    deleteProfileFile(name);
                    setRevision(prev => prev + 1);
                    afterDelete()
                }
            },
            { text: translate("Cancel"), onPress: () => { } }
        ])

    }

    function handleDeleteDie(name: string, afterDelete: () => void): void {
        Alert.alert(translate("DeleteDieTitle"), fTranslate("DeleteDieAlert", name), [
            {
                text: translate("Delete"), onPress: () => {
                    deleteDice(name);
                    setRevision(prev => prev + 1);
                    afterDelete()
                }
            },
            { text: translate("Cancel"), onPress: () => { } }
        ])

    }

    return <View style={[gStyles.screenContainer, { top: insets.top, left: insets.left }]}>
        {busy && <ActivityIndicator size={"large"} style={styles.busy} />}

        {/** Profile Picker */}
        <ProfilePicker
            folder={Folders.Profiles}
            currentProfile={Settings.getString(SettingsKeys.CurrentProfileName, "")}
            open={openLoadProfile}
            loadButton={{ name: translate("Load"), icon: "upload" }}
            exportButton={{ name: translate("Export") }}
            height={windowSize.height * .6}
            onSelect={async (profileName) => {
                console.log("select profile", profileName)
                setProfileBusy(true);
                LoadProfileFileIntoSettings(profileName)
                    .then(() => setRevision(prev => prev + 1))
                    .finally(() => setProfileBusy(false));
                setOpenLoadProfile(false);

            }}
            editButton={{ name: translate("Rename") }}
            onEdit={(name, afterSave) => setShowEditProfileName({
                name,
                afterSave
            })}
            onDelete={(name, afterDelete) => handleDeleteProfile(name, afterDelete)}
            onClose={() => setOpenLoadProfile(false)}
            onExport={handleExportProfile}
            isNarrow={isScreenNarrow}
        />


        {/** Cube Picker */}
        <DiePicker
            open={openSelectTemplate > -1}
            height={windowSize.height * .8}
            onSelect={async (template) => {
                setDiceTemplate(openSelectTemplate, template as Templates);
                setOpenSelectTemplate(-1);
                setSetDieAfterCreate(-1);
            }}
            onEdit={(template) => {
                setOpenSelectTemplate(-1);
                setEditOrCreateDice(template);
                setSetDieAfterCreate(-1);
            }}
            onClose={() => {
                setOpenSelectTemplate(-1);
                setSetDieAfterCreate(-1);
            }}
            onCreate={() => {
                setSetDieAfterCreate(openSelectTemplate);
                setOpenSelectTemplate(-1);
                setEditOrCreateDice("")
            }}
            onExport={handleExportDice}
            onDelete={(name, afterDelete) => handleDeleteDie(name, afterDelete)}
            currentDie={openSelectTemplate >= 0 && openSelectTemplate < profile.dice.length ? profile.dice[openSelectTemplate].template : EmptyDice.template}
        />

        <MyColorPicker title={translate("SelectColor")} allowCustom={true} color={profile.tableColor}
            height={300} width={windowSize.width} isScreenNarrow={true} onClose={() => setOpenColorPicker(false)}
            onSelect={(color) => {
                handleSetTableColor(color);
                setOpenColorPicker(false);
            }} open={openColorPicker}
        />

        {showEditProfileName != undefined && <EditText
            label={showEditProfileName.name.length > 0 ? translate("RenameProfile") : translate("SetProfileName")}
            initialText={""}
            textOnly={true}
            onClose={() => setShowEditProfileName(undefined)}
            onDone={(newName) => {
                const newNamedTrimmed = newName.text.trim()
                if (newNamedTrimmed == "") {
                    Alert.alert(translate("ProfileMissingName"), "", [{ text: translate("OK") }]);
                    return;
                }

                if (!isValidFilename(newNamedTrimmed)) {
                    Alert.alert(fTranslate("InvalidName", InvalidCharachters), "", [{ text: translate("OK") }]);
                    return;
                }

                handleProfileEditName(newNamedTrimmed, showEditProfileName.name, showEditProfileName.afterSave);
                setShowEditProfileName(undefined);
            }}
            width={400}
            textWidth={300}
            textHeight={80}
        />}

        {editOrCreateDice != undefined && <EditDice
            name={editOrCreateDice}
            windowSize={windowSize}
            onClose={() => {
                // todo rename cube
                setEditOrCreateDice(undefined)
                setRevision(prev => prev + 1)
            }}
            onAfterSave={(name) => {
                if (setDieAfterCreate >= 0) {
                    setDiceTemplate(setDieAfterCreate, name as Templates);
                    setSetDieAfterCreate(-1);
                    setRevision(prev => prev + 1)
                }
            }}
        />}

        <ScreenTitle title={translate("Settings")} onClose={() => onClose()} onAbout={() => onAbout()} iconName="check" />

        {/* Profile Name */}
        <View style={[gStyles.screenSubTitle, {
            flexDirection: isScreenNarrow ? "column" : "row",
            direction: isRTL() ? "rtl" : "ltr",

        },
        isScreenNarrow && { height: 120 }
        ]} >

            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconIonicons name="person-circle-outline" size={45} color={colors.titleBlue} />
                <Text allowFontScaling={false} style={gStyles.screenSubTitleText}>{translate("ProfileName")}:</Text>
                <Text allowFontScaling={false} style={[gStyles.screenSubTitleText, { textAlign: isRTL() ? "right" : "left" },
                profileName.length == 0 && { color: disabledColor }]}>
                    {profileName.length > 0 ? profileName : translate("ProfileNoName")}
                </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                {profileBusy && <ActivityIndicator color="#0000ff" size="large" />}
                {profileName.length > 0 ?
                    <IconButton text={translate("Close")} onPress={closeProfile} /> :
                    <IconButton text={translate("Create")} onPress={() =>
                        setShowEditProfileName({ name: "", afterSave: () => setRevision(prev => prev + 1) })
                    } />
                }
                <IconButton text={translate("List")} onPress={() => setOpenLoadProfile(true)} />

            </View>
        </View>

        {!isMobile && <Text allowFontScaling={false} style={[gStyles.sectionSetHeaderText, isRTL() && { textAlign: "right" }]}>{translate("DiceSectionTitle")}</Text>}
        <ScrollView style={styles.settingHost}>
            <View style={[styles.cubes, { marginHorizontal }]}>
                {
                    [0, 1, 2, 3].map((i: any) => (
                        <DiceSettings
                            width={cubeSettingSize}
                            height={cubeSettingSize * .8}
                            key={i}
                            dice={revision >= 0 && profile.dice.length >= i + 1 ? profile.dice[i] : EmptyDice}
                            onSetActive={(newVal) => setDiceActive(i, newVal)}
                            onOpenLoadDice={() => setOpenSelectTemplate(i)}
                            onEditDice={isStaticDie(profile.dice[i].template) ? undefined : () => {
                                setOpenSelectTemplate(-1);
                                setSetDieAfterCreate(-1);
                                if (profile.dice.length > i) {
                                    setEditOrCreateDice(profile.dice[i].template);
                                }
                            }}
                        />

                    ))
                }
            </View>

            {!isMobile && <Text allowFontScaling={false} style={[gStyles.sectionSetHeaderText, isRTL() && { textAlign: "right" }]}>{translate("GeneralSectionTitle")}</Text>}

            {/* Recovery time */}
            <Section
                marginHorizontal={marginHorizontal}
                iconName="timer-outline"
                component={<NumberSelector min={0} max={45} value={profile.recoveryTime}
                    onUp={() => handleSetRecoveryTime(profile.recoveryTime + 5)} onDown={() => handleSetRecoveryTime(profile.recoveryTime - 5)}
                />}
                title={translate("RecoveryTime")}
            />

            {/* Table Color */}
            <Section
                marginHorizontal={marginHorizontal}

                iconName="format-color-fill"
                component={
                    <View style={[styles.colorCircle, { backgroundColor: safeColor(profile.tableColor) }]} onTouchEnd={() => setOpenColorPicker(true)} />}
                title={translate("TableColor")}
            />

            {/* Sound Enabled */}
            <Section
                marginHorizontal={marginHorizontal}

                iconName="volume-high"
                component={
                    <Switch
                        value={profile.soundEnabled}
                        onValueChange={(enabled) => handleSetSoundEnabled(enabled)}
                        color={colors.switchColor}
                    />}
                title={translate("EnableSound")}
            />

            {/* Dice Size */}
            <Section
                marginHorizontal={marginHorizontal}

                iconName="dice-3-outline"
                component={<NumberSelector min={1} max={5} value={profile.size}
                    onUp={() => handleSetSize(profile.size + 1)} onDown={() => handleSetSize(profile.size - 1)} />}
                title={translate("DiceSize")}
            />

            {/* Backup Color */}
            <Section
                marginHorizontal={marginHorizontal}

                iconName="briefcase-upload-outline"
                component={<IconButton text={translate("BackupAll")} onPress={handleBackupAll} />}
                title={translate("Backup")}
            />

        </ScrollView >
    </View >
}

const styles = StyleSheet.create({
    settingHost: {
        width: "100%",
        flex: 1,
        backgroundColor: "#F5F5F5",
        position: "relative"
    },
    colorCircle: {
        width: 40, height: 40,
        borderRadius: 20,
    },
    cubes: {
        marginTop: 10,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    busy: {
        position: "absolute",
        left: "45%", height: "45%",
        zIndex: 1000
    }
});