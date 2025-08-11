# Firebase Authentication Setup for Miso70

## What is Firebase?

Firebase is Google's comprehensive app development platform that provides ready-to-use services for building mobile and web applications. Think of it as a "backend-as-a-service" that handles complex server-side operations so you can focus on your app's features.

### Key Firebase Services:
- **Authentication**: User sign-up, login, password reset
- **Firestore Database**: NoSQL cloud database for storing user data
- **Storage**: File storage (images, documents)
- **Hosting**: Web app hosting
- **Analytics**: User behavior tracking
- **Cloud Functions**: Serverless backend code

### Why Firebase for Miso70?
- **No server management**: Google handles infrastructure
- **Real-time updates**: Changes sync instantly across devices
- **Offline support**: Works without internet
- **Scalable**: Handles growth automatically
- **Free tier**: Generous limits for small apps

---

## Step-by-Step Implementation

### Step 1: Set up Firebase Configuration

#### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "Miso70" 
4. Enable Google Analytics (optional)
5. Choose default account

#### 1.2 Add Your App
1. Click "Add app" → "Web" (for Expo)
2. Register app with name "Miso70"
3. Copy the config object (we'll use this)

#### 1.3 Install Firebase Dependencies
```bash
cd projects/Miso70/miso70
expo install firebase
expo install @react-native-async-storage/async-storage
expo install expo-dev-client
```

#### 1.4 Update Firebase Config
Replace the placeholder values in `src/firebase.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Step 2: Create Login/Signup Screens

The login and signup screens have been created with:
- Modern, consistent design matching your app's aesthetic
- Form validation and error handling
- Loading states and user feedback
- Navigation between login and signup

### Step 3: Integrate with Your Existing Navigation

The authentication flow has been integrated:
- **AuthNavigator**: Handles login/signup screens
- **AppNavigator**: Your main app navigation
- **Conditional rendering**: Shows auth screens when not logged in, main app when logged in

### Step 4: Add User Profile Management

The profile screen includes:
- **Account Information**: Display name, email, member since
- **Cooking Preferences**: Links to your existing preferences system
- **Account Actions**: Settings, help, sign out
- **Edit functionality**: Inline editing of display name

### Step 5: Connect to Your Existing Preferences System

The authentication system is designed to work with your existing preferences:
- User preferences are stored in Firebase Firestore
- Seamless integration with your current preferences screen
- Data persistence across app sessions

---

## How It All Works Together

### Authentication Flow:
1. **App Launch**: Checks if user is logged in
2. **Not Logged In**: Shows login/signup screens
3. **Logged In**: Shows main app with user data loaded
4. **Profile Management**: Users can edit their information
5. **Preferences Sync**: User preferences are saved to Firebase

### Data Structure:
```javascript
// User Profile in Firestore
{
  uid: "user-id",
  email: "user@example.com",
  displayName: "John Doe",
  createdAt: Date,
  lastLogin: Date,
  preferences: {
    dietaryRestrictions: ["Vegan", "Low Carb"],
    cuisinePreferences: ["Italian", "Japanese"],
    skillLevel: "Intermediate",
    allergies: ["Nuts", "Shellfish"]
  }
}
```

### Security Rules:
Firebase Firestore security rules ensure:
- Users can only access their own data
- Data is protected from unauthorized access
- Real-time updates are secure

---

## Next Steps

### Immediate Actions:
1. **Set up Firebase project** (follow Step 1.1-1.2)
2. **Install dependencies** (Step 1.3)
3. **Update configuration** (Step 1.4)
4. **Test the authentication flow**

### Future Enhancements:
1. **Social Login**: Google, Apple, Facebook
2. **Password Reset**: Email-based password recovery
3. **Email Verification**: Confirm email addresses
4. **Profile Pictures**: Upload and manage user avatars
5. **Recipe Favorites**: Save and sync favorite recipes
6. **Cooking History**: Track user's cooking journey
7. **Social Features**: Share recipes with friends

### Integration with Your Backend:
- Your existing Express backend can continue to work
- Firebase handles user authentication
- Your backend can use Firebase Admin SDK for server-side operations
- Recipe generation and AI features remain unchanged

---

## Troubleshooting

### Common Issues:
1. **Firebase config errors**: Double-check your configuration values
2. **Navigation issues**: Ensure all screens are properly imported
3. **TypeScript errors**: Install Firebase types if needed
4. **AsyncStorage errors**: Make sure expo-dev-client is installed

### Testing:
1. Test signup with new email
2. Test login with existing account
3. Test profile editing
4. Test logout functionality
5. Test app restart (should remember login state)

---

## Security Considerations

1. **API Keys**: Never commit Firebase config to public repositories
2. **Environment Variables**: Use .env files for sensitive data
3. **Firestore Rules**: Set up proper security rules
4. **Data Validation**: Validate user input on both client and server
5. **Error Handling**: Don't expose sensitive information in error messages

This setup provides a solid foundation for user authentication and profile management while maintaining the existing functionality of your Miso70 app. 