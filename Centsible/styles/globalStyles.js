import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
    splashContainer: {
      flex: 1,
      backgroundColor: 'purple',
      alignItems: 'center',
      justifyContent: 'flex-start', // Align items at the start
    },
    imageContainer: {
      flex: 0.8, // Adjust this to control image height
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50, 
    },
    textContainer: {
      alignItems: 'center', // Center horizontally
      marginTop: 20, // Add some margin for spacing
    },
    welcomeText: {
      color: 'white', // Change text color for better visibility
      fontSize: 55,
      textAlign: 'center', // Center text alignment
    },
    screenText: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center'
    }
  });