import { Text, View} from 'react-native';
import { globalStyles } from '../styles/globalStyles';

export default function GoalsScreen() {
    return (
      <View style={globalStyles.screenText}>
        <Text>Goals</Text>
      </View>
    );
  }