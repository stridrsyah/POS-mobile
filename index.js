// index.js — Entry point aplikasi React Native
// File ini mendaftarkan komponen App ke runtime Expo/React Native

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent memastikan environment sudah siap
// baik di Expo Go maupun build standalone (APK/IPA)
registerRootComponent(App);
