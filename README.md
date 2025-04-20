


# new react-native version
- babel.config.js
- copy src
- copy patches
- copy assets
- fonts:
  - react-native.config.js
  - copy assets/fonts
  - `npx react-native-asset`
- copy design-resources
- merge metro.config.js
## XCode
- add "Supported destination" (mac, iPad)
- minimum deployment 16, 11.5
- App category: "education"
- Copy AppIcon
- Copy IssieDice model (copy the file and add it to proj)

# Adding fonts:
- add font file to assets/fonts
- run `npx react-native-asset`


Mockups:

https://xd.adobe.com/view/43e02c8a-ebee-4495-aff9-042b85e213b6-16b3
https://xd.adobe.com/view/2787b739-50b8-4610-b19a-fcadc5c5f1ff-72d4/


# Patching NPM modules
- new change:
  - run `npx patch-package <package-name>`
- current changes:
  - react-native-sound:
    - fix bug in loading asset
  - react-native-camera-kit
    - fix bug of hiding the frame and barcode scan
