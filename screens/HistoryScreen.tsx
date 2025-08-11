import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import CustomText from '../components/CustomText';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDish } from '../contexts/DishContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorScreen from '../components/ErrorScreen';

const screenWidth = Dimensions.get('window').width;
const SIDE_MARGIN = 32;

function formatTimeAgo(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return `Yesterday`;
  return `${diffDays} days ago`;
}

function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2419200) return `${Math.floor(diff / 604800)} weeks ago`;
  return then.toLocaleDateString();
}

function groupHistory(dishes) {
  const now = new Date();
  const recent = [];
  const thisWeek = [];
  const earlier = [];

  dishes.forEach(dish => {
    const diff = (now - new Date(dish.timestamp)) / 1000;
    if (diff < 86400 * 2) { // last 2 days
      recent.push(dish);
    } else if (diff < 86400 * 7) { // this week
      thisWeek.push(dish);
    } else {
      earlier.push(dish);
    }
  });

  return { recent, thisWeek, earlier };
}

export default function HistoryScreen() {
  const { dishHistory, isLoadingHistory, loadDishFromHistory, setDishHistory, setCurrentDish } = useDish();
  const navigation = useNavigation();
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const hasHistory = dishHistory && dishHistory.length > 0;

  const handleLoadDish = (dishId: string) => {
    try {
      loadDishFromHistory(dishId);
      navigation.navigate('Dish');
    } catch (e) {
      setError(true);
    }
  };

  const handleReplayDish = async (dish) => {
    setLoading(true);
    try {
      // Add a minimum loading time to ensure the spinner is visible
      const startTime = Date.now();
      setCurrentDish(dish);
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 800; // 800ms minimum
      
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      navigation.navigate('Dish' as never);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const { recent, thisWeek, earlier } = groupHistory(dishHistory);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <ErrorScreen
          title="Oops! Something Went Wrong"
          message="We couldn't load your history. Please check your connection and try again."
          onRetry={() => setError(null)}
        />
      </SafeAreaView>
    );
  }

  if (isLoadingHistory) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingSpinner visible={true} />
          <CustomText style={styles.emptySubtitle}>Loading your history...</CustomText>
        </View>
      </SafeAreaView>
    );
  }

  if (!dishHistory || dishHistory.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CustomText style={styles.emptyTitle}>No History Yet</CustomText>
          <CustomText style={styles.emptySubtitle}>Your generated dishes will appear here.</CustomText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <LoadingSpinner visible={loading} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <CustomText style={styles.pageTitle}>Recipe History</CustomText>
        <CustomText style={styles.pageSubtitle}>Tap any dish to set it up again</CustomText>
        {recent.length > 0 && (
          <>
            <CustomText style={styles.sectionTitle}>Recent Dishes</CustomText>
            {recent.map((dish, idx) => (
              <TouchableOpacity
                key={dish.id || idx}
                style={styles.historyEntry}
                onPress={() => handleReplayDish(dish)}
                activeOpacity={0.7}
              >
                <View>
                  <CustomText style={styles.historyDishName}>{dish.title}</CustomText>
                  <CustomText style={styles.historySubtitle}>
                    {dish.cuisine} • {timeAgo(dish.timestamp)}
                  </CustomText>
                </View>
                <FontAwesome name="chevron-right" size={20} color="#d46e57" />
              </TouchableOpacity>
            ))}
          </>
        )}
        {thisWeek.length > 0 && (
          <>
            <CustomText style={styles.sectionTitle}>This Week</CustomText>
            {thisWeek.map((dish, idx) => (
              <TouchableOpacity
                key={dish.id || idx}
                style={styles.historyEntry}
                onPress={() => handleReplayDish(dish)}
                activeOpacity={0.7}
              >
                <View>
                  <CustomText style={styles.historyDishName}>{dish.title}</CustomText>
                  <CustomText style={styles.historySubtitle}>
                    {dish.cuisine} • {timeAgo(dish.timestamp)}
                  </CustomText>
                </View>
                <FontAwesome name="chevron-right" size={20} color="#d46e57" />
              </TouchableOpacity>
            ))}
          </>
        )}
        {earlier.length > 0 && (
          <>
            <CustomText style={styles.sectionTitle}>Earlier</CustomText>
            {earlier.map((dish, idx) => (
              <TouchableOpacity
                key={dish.id || idx}
                style={styles.historyEntry}
                onPress={() => handleReplayDish(dish)}
                activeOpacity={0.7}
              >
                <View>
                  <CustomText style={styles.historyDishName}>{dish.title}</CustomText>
                  <CustomText style={styles.historySubtitle}>
                    {dish.cuisine} • {timeAgo(dish.timestamp)}
                  </CustomText>
                </View>
                <FontAwesome name="chevron-right" size={20} color="#d46e57" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emptyTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#878f89',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  ctaButtonText: {
    color: '#4b6053',
    fontSize: 17,
    fontWeight: '500',
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  historyEntry: {
    backgroundColor: '#f8f9f8',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    width: '85%',
    alignSelf: 'flex-start',
    marginLeft: SIDE_MARGIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDishName: {
    color: '#4b6053',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Bitter_600SemiBold',
    marginBottom: 2,
  },
  historySubtitle: {
    color: '#878f89',
    fontSize: 14,
    fontFamily: 'Bitter_400Regular',
    marginTop: 0,
  },
  sectionTitle: {
    color: '#4b6053',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    marginTop: 10,
    marginBottom: 16,
    marginLeft: 24,
    textAlign: 'left',
  },
  pageTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    marginBottom: 8,
    textAlign: 'left',
    marginLeft: SIDE_MARGIN,
  },
  pageSubtitle: {
    color: '#b6b7b3',
    fontSize: 15,
    fontFamily: 'Bitter_400Regular',
    marginBottom: 16,
    marginLeft: SIDE_MARGIN,
    textAlign: 'left',
  },
  timeSectionTitle: {
    color: '#4b6053',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    marginBottom: 8,
    marginLeft: SIDE_MARGIN,
    textAlign: 'left',
  },
});