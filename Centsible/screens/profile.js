import { Text, View } from 'react-native';
import { globalStyles } from '../styles/globalStyles';

export default function ProfileScreen() {
    return (
      <View style={globalStyles.screenText}>
        <Text>Profile</Text>
      </View>
    );
  }