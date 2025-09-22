import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import CustomText from './CustomText';

type ContextTagsProps = {
  chatContext?: string;
  preferences?: {
    dietaryRestrictions?: string[];
    cuisines?: string[];
    classicDishes?: string[];
    plateStyles?: string[];
    ingredientPreferences?: string[];
  };
  conversationContext?: {
    preferences: Array<{ type: string; value: string }>;
  };
  onRemoveContext?: (type: string, value: string) => void;
};

const ContextTags: React.FC<ContextTagsProps> = ({ chatContext, preferences, conversationContext, onRemoveContext }) => {
  const componentIdRef = useRef<string>(`context-tags-${Date.now()}-${Math.random()}`);
  
  console.log('ContextTags: Component called with props:', { 
    chatContext, 
    preferences: !!preferences, 
    conversationContext: conversationContext?.preferences?.length || 0,
    conversationContextPreferences: conversationContext?.preferences || []
  });
  console.log('ContextTags: Component re-render detected, componentId:', componentIdRef.current);
  
  // Build all tags first
  const allTags: Array<{ type: string; value: string; label: string }> = [];
  const seenValues = new Set<string>(); // Track seen values to prevent duplicates

  // Helper function to add tag if not duplicate
  const addTagIfUnique = (tag: { type: string; value: string; label: string }) => {
    const normalizedValue = tag.value.toLowerCase().trim();
    
    if (normalizedValue && !seenValues.has(normalizedValue)) {
      seenValues.add(normalizedValue);
      allTags.push(tag);
    }
  };

  // Priority: conversationContext.preferences (most recent and accurate)
  if (conversationContext && conversationContext.preferences.length > 0) {
    console.log('ContextTags: Processing conversation context:', conversationContext.preferences);
    console.log('ContextTags: Looking for "Let\'s" in conversation context:', conversationContext.preferences.some(p => p.value === 'Let\'s' || p.value === 'let\'s' || p.value === 'Let\u2019s' || p.value === 'let\u2019s' || p.value === 'lets'));
    console.log('ContextTags: All values in conversation context:', conversationContext.preferences.map(p => `"${p.value}"`));
    conversationContext.preferences.forEach(item => {
      console.log('ContextTags: Processing conversation item:', item);
      if (item.type === 'userWord') {
        // Check if this is "Let's" or "let's" and exclude it
        console.log('ContextTags: Checking if item.value matches Let\'s patterns:', {
          value: item.value,
          valueLength: item.value.length,
          valueCharCodes: item.value.split('').map(c => `${c}(${c.charCodeAt(0)})`),
          matchesLetAposS: item.value === 'Let\'s',
          matchesLetAposSLower: item.value === 'let\'s',
          matchesLetCurlyAposS: item.value === 'Let\u2019s',
          matchesLetCurlyAposSLower: item.value === 'let\u2019s',
          matchesLets: item.value === 'lets'
        });
        // Check for both straight apostrophe (') and curly apostrophe (')
        if (item.value === 'Let\'s' || item.value === 'let\'s' || item.value === 'Let\u2019s' || item.value === 'let\u2019s' || item.value === 'lets') {
          console.log('ContextTags: Excluding "Let\'s" from conversation context:', item.value);
          return; // Skip this item
        }
        // Handle user words (extracted from original message) - capitalize properly
        addTagIfUnique({
          type: 'chat',
          value: item.value,
          label: item.value.charAt(0).toUpperCase() + item.value.slice(1)
        });
      } else if (item.value !== 'style') { // Exclude 'style' as requested for other types
        addTagIfUnique({
          type: item.type,
          value: item.value,
          label: item.value
        });
      } else {
        console.log('ContextTags: Excluding "style" item');
      }
    });
  } else {
    console.log('ContextTags: No conversation context or empty preferences');
  }

  // Fallback: chatContext (only if no conversationContext)
  if (!conversationContext?.preferences?.length && chatContext) {
    console.log('ContextTags: Processing chatContext as fallback:', chatContext);
    // Check if this is already processed context (contains ":") or original context
    if (chatContext.includes(':')) {
      // Processed context - extract clean values
      const contextParts = chatContext.split(', ').map(part => {
        const cleanPart = part.replace(/^(style|dishType|cuisine|dietary|ingredient):\s*/i, '');
        return cleanPart.trim();
      });
      
      contextParts.forEach(part => {
        if (part && part.length > 0 && part !== 'style') {
          addTagIfUnique({
            type: 'chat',
            value: part,
            label: part
          });
        }
      });
    } else {
      // Original context - extract meaningful words
      const words = chatContext.toLowerCase().split(/\s+/);
      console.log('ContextTags: Original chatContext:', chatContext);
      console.log('ContextTags: Original chatContext words:', words);
      console.log('ContextTags: Looking for "let\'s" in words:', words.includes('let\'s'));
      console.log('ContextTags: Looking for "lets" in words:', words.includes('lets'));
      console.log('ContextTags: Word lengths:', words.map(w => `${w}(${w.length})`));
      console.log('ContextTags: Words with apostrophes:', words.filter(w => w.includes('\'')));
      
      // Custom filter that preserves important culinary terms
      const meaningfulWords = words.filter(word => {
        // Keep words longer than 2 characters
        if (word.length <= 2) return false;
        
        // Common words to exclude - expanded list
        const excludeWords = [
          'the', 'in', 'with', 'and', 'or', 'a', 'an', 'to', 'for', 'of', 'on', 'at', 'by', 'let\'s', 'lets',
          'take', 'dish', 'add', 'make', 'cook', 'get', 'put', 'use', 'this', 'that', 'these', 'those',
          'some', 'any', 'all', 'each', 'every', 'much', 'many', 'more', 'most', 'less', 'few', 'little',
          'very', 'really', 'quite', 'just', 'only', 'also', 'too', 'so', 'but', 'however', 'though',
          'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must', 'have', 'has', 'had',
          'do', 'does', 'did', 'be', 'is', 'are', 'was', 'were', 'been', 'being', 'am', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
          'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
          'what', 'when', 'where', 'why', 'how', 'who', 'which', 'whose', 'whom'
        ];
        if (excludeWords.includes(word)) {
          console.log('ContextTags: Excluding word (excludeWords):', word);
          return false;
        }
        
        // Special check for "let's" variations (including punctuation)
        if (word === 'let\'s' || word === 'lets' || word.startsWith('let\'s') || word.startsWith('lets')) {
          console.log('ContextTags: Excluding word (let\'s check):', word);
          return false;
        }
        
        // Special case: exclude "style" but keep other meaningful words
        if (word === 'style') {
          console.log('ContextTags: Excluding word (style):', word);
          return false;
        }
        
        // Additional filtering: exclude common action words that aren't culinary-specific
        const actionWords = ['want', 'need', 'like', 'love', 'try', 'think', 'know', 'see', 'look', 'find', 'go', 'come', 'give', 'show', 'tell', 'ask', 'help'];
        if (actionWords.includes(word)) {
          console.log('ContextTags: Excluding word (actionWords):', word);
          return false;
        }
        
        // Additional filtering: exclude common descriptive words that aren't culinary-specific
        const descriptiveWords = ['good', 'bad', 'nice', 'great', 'awesome', 'amazing', 'cool', 'hot', 'cold', 'warm', 'big', 'small', 'large', 'tiny', 'huge', 'new', 'old', 'fresh', 'clean', 'dirty'];
        if (descriptiveWords.includes(word)) {
          console.log('ContextTags: Excluding word (descriptiveWords):', word);
          return false;
        }
        
        console.log('ContextTags: Keeping word:', word);
        return true;
      });
      
      console.log('ContextTags: Filtered meaningful words:', meaningfulWords);
      console.log('ContextTags: Words that were filtered out:', words.filter(word => !meaningfulWords.includes(word)));
      
      // Add each meaningful word as a separate tag
      meaningfulWords.forEach(word => {
        if (word && word.length > 0) {
          // Special handling for "tamales" -> "tamale" (singular)
          let displayWord = word;
          if (word === 'tamales') {
            displayWord = 'tamale';
          }
          
          addTagIfUnique({
            type: 'chat',
            value: displayWord,
            label: displayWord.charAt(0).toUpperCase() + displayWord.slice(1) // Capitalize
          });
        }
      });
    }
  }





  console.log('ContextTags: Final allTags array:', allTags);
  
  if (allTags.length === 0) {
    console.log('ContextTags: No tags to display, returning null');
    return null;
  }

  const handleRemove = (type: string, value: string) => {
    console.log('ContextTags: handleRemove called with type:', type, 'value:', value);
    console.log('ContextTags: Total tags count:', allTags.length);
    
    // Call global state update to remove from conversation context immediately
    if (onRemoveContext) {
      console.log('ContextTags: Calling onRemoveContext immediately');
      console.log('ContextTags: About to remove from global state:', { type, value });
      console.log('ContextTags: onRemoveContext function:', onRemoveContext);
      // Fix: Convert "chat" type to "userWord" type for global state
      const globalType = type === 'chat' ? 'userWord' : type;
      console.log('ContextTags: Converting type from', type, 'to', globalType);
      onRemoveContext(globalType, value);
      console.log('ContextTags: Global state update completed');
    } else {
      console.log('ContextTags: onRemoveContext is not provided');
    }
  };

  console.log('ContextTags: allTags count:', allTags.length);
  
  return (
    <View style={styles.tagsContainer}>
      {allTags.map((tag, index) => {
        return (
          <View key={`${tag.type}-${tag.value}-${index}`} style={styles.tag}>
            <CustomText style={styles.tagText}>{tag.label}</CustomText>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => {
                console.log('ContextTags: Remove button pressed for tag:', tag.type, tag.value);
                handleRemove(tag.type, tag.value);
              }}
              activeOpacity={0.7}
            >
              <CustomText style={styles.removeText}>×</CustomText>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#67756a', // App's muted green color (matches text/logo)
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8, // Rounded square instead of pill
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
    marginRight: 4,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  removeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    lineHeight: 14,
  },
});

export default ContextTags;
