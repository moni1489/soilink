import { Platform } from 'react-native';
import FieldMapNative from './FieldMap.native';
import FieldMapWeb from './FieldMap.web';

// Since React Native bundlers automatically resolve .web.js and .native.js,
// we could just import FieldMap directly. But a barrel file with dynamic
// re-export is also safe for documentation and clarity.
const FieldMap = Platform.OS === 'web' ? FieldMapWeb : FieldMapNative;

export default FieldMap;
