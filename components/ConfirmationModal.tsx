import React from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import CustomText from './CustomText';
import { FontAwesome } from '@expo/vector-icons';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: string;
  showCancel?: boolean;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmColor = '#d46e57',
  showCancel = true
}: ConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <CustomText style={styles.modalTitle}>{title}</CustomText>
          <CustomText style={styles.modalMessage}>{message}</CustomText>
          
          <View style={styles.modalButtons}>
            {showCancel && (
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <CustomText style={styles.cancelButtonText}>{cancelText}</CustomText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <CustomText style={styles.confirmButtonText}>{confirmText}</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  modalTitle: {
    color: '#4b6053',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#768178',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  modalButton: {
    width: '80%',
    maxWidth: 320,
    marginVertical: 6,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  confirmButton: {
    // backgroundColor is set dynamically
  },
  cancelButtonText: {
    color: '#768178',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
