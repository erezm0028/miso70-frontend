import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useDish } from '../contexts/DishContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const { user, userProfile, signOut, updateUserProfile } = useAuth();
  const { currentDish, dishHistory, clearPreferences, clearChatMessages, clearConversationContext, setCurrentDish, setDishHistory, saveDishHistoryToFirestore, finalizeDish } = useDish();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({ displayName });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      console.log('Current dish:', currentDish ? currentDish.title : 'None');
      console.log('Current dish history length:', dishHistory.length);
      
      // Create updated history with current dish if it exists
      let updatedHistory = [...dishHistory];
      if (currentDish) {
        console.log('Adding current dish to history:', currentDish.title);
        // Check if current dish is already in history
        const existingIndex = updatedHistory.findIndex(dish => dish.id === currentDish.id);
        if (existingIndex >= 0) {
          console.log('Updating existing dish in history');
          // Update existing dish in history
          updatedHistory[existingIndex] = currentDish;
        } else {
          console.log('Adding new dish to history');
          // Add current dish to history
          updatedHistory = [currentDish, ...updatedHistory];
        }
      }
      
      console.log('Final history to save:', updatedHistory.length, 'dishes');
      
      // Save updated dish history to Firestore in background (don't wait for it)
      if (updatedHistory.length > 0) {
        console.log('Saving dish history to Firestore...');
        saveDishHistoryToFirestore(updatedHistory).catch(error => {
          console.log('Failed to save dish history on logout:', error);
        });
      } else {
        console.log('No dishes to save');
      }
      
      // Clear all dish-related data immediately
      console.log('Clearing local data...');
      clearPreferences();
      clearChatMessages();
      clearConversationContext();
      setCurrentDish(null);
      setDishHistory([]); // Clear dish history
      
      // Sign out immediately
      console.log('Signing out...');
      await signOut();
      setShowLogoutModal(false);
      console.log('Logout complete');
    } catch (error: any) {
      console.error('Error during logout:', error);
      Alert.alert('Error', error.message);
    }
  };

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const ProfileItem = ({ icon, label, value, onPress }: { 
    icon: string; 
    label: string; 
    value?: string; 
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.profileItem, onPress && styles.profileItemPressable]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.profileItemLeft}>
        <FontAwesome5 name={icon} size={16} color="#5b6e61" style={styles.profileItemIcon} />
        <Text style={styles.profileItemLabel}>{label}</Text>
      </View>
      <View style={styles.profileItemRight}>
        {value && <Text style={styles.profileItemValue}>{value}</Text>}
        {onPress && <FontAwesome5 name="chevron-right" size={12} color="#cbd5e0" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <FontAwesome5 name="user-circle" size={80} color="#5b6e61" />
          </View>
          <Text style={styles.userName}>{userProfile?.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          {/* Logout Button - Easy to access */}
          <TouchableOpacity
            style={styles.logoutButtonHeader}
            onPress={() => setShowLogoutModal(true)}
          >
            <FontAwesome5 name="sign-out-alt" size={16} color="#718096" />
            <Text style={styles.logoutButtonTextHeader}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      {/* Profile Information */}
      <ProfileSection title="Account Information">
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
            />
            <View style={styles.editButtons}>
              <TouchableOpacity 
                style={[styles.editButton, styles.cancelButton]} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editButton, styles.saveButton]} 
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ProfileItem 
            icon="user" 
            label="Display Name" 
            value={userProfile?.displayName}
            onPress={() => setIsEditing(true)}
          />
        )}
        <ProfileItem icon="envelope" label="Email" value={user?.email} />
        <ProfileItem icon="calendar" label="Member Since" value={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'} />
      </ProfileSection>

      {/* Preferences */}
      <ProfileSection title="Cooking Preferences">
        <ProfileItem 
          icon="sliders-h" 
          label="Dietary Preferences" 
          value={`${userProfile?.preferences?.dietaryRestrictions?.length || 0} selected`}
          onPress={() => {/* Navigate to preferences */}}
        />
        <ProfileItem 
          icon="utensils" 
          label="Cuisine Preferences" 
          value={`${userProfile?.preferences?.cuisinePreferences?.length || 0} selected`}
          onPress={() => {/* Navigate to preferences */}}
        />
        <ProfileItem 
          icon="star" 
          label="Skill Level" 
          value={userProfile?.preferences?.skillLevel || 'Not set'}
          onPress={() => {/* Navigate to preferences */}}
        />
      </ProfileSection>

              {/* Account Actions */}
        <ProfileSection title="Account">
          <ProfileItem 
            icon="cog" 
            label="Settings" 
            onPress={() => {/* Navigate to settings */}}
          />
          <ProfileItem 
            icon="question-circle" 
            label="Help & Support" 
            onPress={() => {/* Navigate to help */}}
          />
        </ProfileSection>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.logoutButton]} 
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Add extra padding to ensure logout button is reachable
    paddingHorizontal: 0, // Remove horizontal padding to allow full-width header
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 30, // Add padding back to the content
    width: '100%', // Ensure full width
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#718096',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f7fafc',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileItemPressable: {
    backgroundColor: '#fff',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemIcon: {
    marginRight: 12,
    width: 20,
  },
  profileItemLabel: {
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
  },
  profileItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemValue: {
    fontSize: 14,
    color: '#718096',
    marginRight: 8,
  },
  editContainer: {
    padding: 20,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#d46e57',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 40,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  logoutButton: {
    backgroundColor: '#e53e3e',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#718096',
    marginTop: 16,
  },
  logoutButtonTextHeader: {
    color: '#718096',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileScreen; 