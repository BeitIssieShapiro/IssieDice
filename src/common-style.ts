import { StyleSheet } from "react-native";

export const colors = {
    titleBlue: "#193C73",
    sectionIconColor: "#4FA1D1",
    switchColor: "#193C73",
    titleButtonsBG: "#F5F5F5",
    disabled: "gray",
    defaultIconColor: "#6E6E6E",
}

export const menuActionIcon = {
    color:colors.titleBlue,
    size:22
}

export const gStyles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        backgroundColor: "#F5F5F5",
        zIndex: 800,
    },
    screenTitle: {
        width: "100%",
        backgroundColor: colors.titleBlue,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 80,
        fontSize: 25,
        borderBottomWidth: 2,
        borderTopWidth: 2,
        borderColor: "#F5F5F5",
        padding: 15,

    },
    screenTitleText: {
        fontSize: 35,
        color: "white",
    },
    screenSubTitle: {
        width: "100%",
        backgroundColor: "white",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: 110,
        fontSize: 20,
        padding: 15,
    },
    screenSubTitleCaption: {
        fontSize: 20,
        fontWeight: "bold",
        color: colors.titleBlue,
        marginLeft: 10,
        marginRight: 10
    },
    screenSubTitleElementTitle: {
        marginEnd: 10,
        marginStart: 10,
        fontSize: 23,
        color: colors.titleBlue,
        fontWeight: "bold"
    },
    screenSubTitleElementName: {
        marginEnd: 10,
        marginStart: 10,
        fontSize: 23,
        color: colors.titleBlue,
    },
    card: {
        borderWidth: 2,
        borderColor: "#F5F5F5",
        backgroundColor: "white",
        borderRadius: 18,
        flexDirection: "column",
        boxShadow: [{
            offsetX: 3,
            offsetY: -3,
            color: "#F5F5F5",
            blurRadius: 3,
            spreadDistance: 3
        }],

    },
    cardTitle: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
        borderColor: "#F5F5F5",
        borderBottomWidth: 2,
    },
    cardBody: {
        position:"relative",
        width: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    cardFooter: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        bottom: 0,
    },
    sectionSetHeaderText: {
        width: "100%",
        fontSize: 22,
        color: "#595959",
        fontWeight: "bold",
        marginBottom: 5,
        paddingHorizontal: 40,
        paddingTop: 10,
    },
    sectionHost: {
        flexDirection: "row",
        backgroundColor: "white",
        height: 50,
        padding: 8,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 45,
        marginTop: 10,
        marginHorizontal: 40
    },
    vchip: {
        height: 70,
        width: 120,
        padding: 10,
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    vchipText: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        textAlign: "center",
    },
    iconBtnColor: {
        color: "#6E6E6E",
    },
    verticalSeperator: {
        width: 2,
        height: "100%",
        backgroundColor: "lightgray",
    },
    horizontalSeperator: {
        height: 2,
        width: "100%",
        backgroundColor: "lightgray",
    },
    labeledIconText: {
        color: "black",
        fontSize: 18,
        minWidth: 100,
        textAlign: "center"
    },
    pickerView: {
        flexDirection: 'column',
        position: 'absolute',
        backgroundColor: "white",
        zIndex: 99999,
        borderBottomColor: "transparent",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 2,
        alignItems: 'center',
        width: "95%",
        left: "2.5%",
        bottom: 0,
        boxShadow: [{
            offsetX: 3,
            offsetY: -3,
            color: "#D6D6D6",
            blurRadius: 4,
            spreadDistance: 3
        }],
    },
    pickerTitleHost: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 90,
        paddingLeft: 25,
        paddingRight: 25,
    },
    pickerTitleText: {
        fontSize: 28,
        margin: 25,
        fontWeight: "bold",
        color: colors.titleBlue,

    }
});