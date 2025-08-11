const BASE_URL = 'http://192.168.1.89:3001'; // Change to your backend URL or local IP if testing on a device

export async function chatWithChef(messages, currentDish = null) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, currentDish }),
  });
  if (!res.ok) throw new Error('Chat API error');
  const data = await res.json();
  return data.reply;
}

export async function generateDish(preferences) {
  console.log('API: Sending preferences to backend:', JSON.stringify({ preferences }, null, 2));
  const res = await fetch(`${BASE_URL}/generate-dish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error('Generate Dish API error');
  const data = await res.json();
  console.log('API: Backend response:', data);
  return data.dish;
}

export async function getRecipeInfo(dishName) {
  const res = await fetch(`${BASE_URL}/recipe-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dishName }),
  });
  if (!res.ok) throw new Error('Recipe Info API error');
  const data = await res.json();
  return data.recipe;
}

export async function generateImage(dish) {
  const res = await fetch(`${BASE_URL}/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dish }),
  });
  if (!res.ok) throw new Error('Image Generation API error');
  const data = await res.json();
  return data.imageUrl;
}

export async function modifyRecipe(currentDish, modification) {
  const res = await fetch(`${BASE_URL}/modify-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dish: currentDish, modification }),
  });
  if (!res.ok) throw new Error('Modify Recipe API error');
  const data = await res.json();
  return data.recipe;
}

export async function getChatDishSuggestion(userMessage, preferences) {
  const res = await fetch(`${BASE_URL}/chat-dish-suggestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, preferences }),
  });
  if (!res.ok) throw new Error('Chat Dish Suggestion API error');
  const data = await res.json();
  return data;
}

export async function fuseDish(currentDish, modification) {
  const res = await fetch(`${BASE_URL}/fuse-dish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentDish, modification }),
  });
  if (!res.ok) throw new Error('Fuse Dish API error');
  const data = await res.json();
  return data;
}
