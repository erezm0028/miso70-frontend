import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import CustomText from './CustomText';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function Header() {
  const navigation = useNavigation();

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  return (
    <View style={styles.header}>
      <Image
        source={require('../assets/MisoToast-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <TouchableOpacity style={styles.avatarContainer} onPress={handleProfilePress}>
        <FontAwesome5 name="user-circle" size={40} color="#5b6e61" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 0,     // Very close to left edge
    paddingRight: 24,   // Keep right side spacing
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  logo: {
    width: 230,   // Adjust width as needed for your design
    height: 70,   // Adjust height as needed for your design
    marginLeft: -60,  // Pull logo closer to left edge
  },
  avatarContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});