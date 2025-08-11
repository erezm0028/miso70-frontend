import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';
import DishScreen from '../screens/DishScreen';
import ChatScreen from '../screens/ChatScreen';
import RecipesScreen from '../screens/RecipesScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SharedRecipeScreen from '../screens/SharedRecipeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useDish } from '../contexts/DishContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PRIMARY_TABS = ['Dish', 'Recipe'];
const SECONDARY_TABS = ['Chat', 'Preferences', 'History'];

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {/* Primary Group */}
      <View style={styles.primaryGroup}>
        {PRIMARY_TABS.map(tabName => {
          const routeIndex = state.routes.findIndex(r => r.name === tabName);
          if (routeIndex === -1) return null;
          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;
          let icon = null;
          if (tabName === 'Dish') icon = <FontAwesome5 name="utensils" size={24} color={isFocused ? '#d46e57' : '#5b6e61'} />;
          if (tabName === 'Recipe') icon = <FontAwesome5 name="file-alt" size={22} color={isFocused ? '#d46e57' : '#5b6e61'} />;
          return (
            <TouchableOpacity key={tabName} style={styles.tabButton} onPress={() => navigation.navigate(tabName)}>
              <View style={styles.iconWrapper}>{icon}</View>
              <Text
                style={[styles.tabLabel, isFocused && styles.activeLabel]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tabName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Secondary Group */}
      <View style={styles.secondaryGroup}>
        {SECONDARY_TABS.map(tabName => {
          const routeIndex = state.routes.findIndex(r => r.name === tabName);
          if (routeIndex === -1) return null;
          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;
          let icon = null;
          if (tabName === 'Chat') icon = <FontAwesome5 name="comment" size={22} color={isFocused ? '#d46e57' : '#5b6e61'} />;
          if (tabName === 'Preferences') icon = <FontAwesome5 name="sliders-h" size={22} color={isFocused ? '#d46e57' : '#5b6e61'} />;
          if (tabName === 'History') icon = <FontAwesome5 name="clock" size={22} color={isFocused ? '#d46e57' : '#5b6e61'} />;
          return (
            <TouchableOpacity key={tabName} style={styles.tabButton} onPress={() => navigation.navigate(tabName)}>
              <View style={[
                styles.iconWrapper,
                isFocused && tabName === 'History' && styles.activeCircle
              ]}>
                {icon}
              </View>
              <Text
                style={[styles.tabLabel, isFocused && styles.activeLabel]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tabName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    height: 90,
    overflow: 'hidden',
  },
  primaryGroup: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#f0f4f1',
    borderTopRightRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryGroup: {
    flex: 3,
    flexDirection: 'row',
    backgroundColor: '#faf9f7',
    borderTopLeftRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  activeCircle: {
    backgroundColor: '#F5E6E0',
  },
  tabLabel: {
    color: '#5b6e61',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  activeLabel: {
    color: '#d46e57',
    fontWeight: '700',
  },
});

export default function AppNavigator() {

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen 
        name="Dish" 
        component={DishScreen}
      />
      <Tab.Screen name="Recipe" component={RecipesScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Preferences" component={PreferencesScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen 
        name="SharedRecipe" 
        component={SharedRecipeScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
}