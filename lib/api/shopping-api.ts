// RecoverShop Shopping API Integration with Personalized Recommendations

export interface ShoppingProduct {
  seq: number;
  name: string;
  price: number;
  stock: number;
  image: string;
  tax: string;
  shipping_fee: number;
  minimum_order_quantity: number;
  maximum_order_quantity: number;
  category: {
    seq: number;
    category_name: string;
  };
  subcategory?: {
    seq: number;
    category_name: string;
  };
  detail?: string;
  seller?: string;
  manufacturer?: string;
  origin?: string;
  brand?: string;
  model?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProductWithLink extends ShoppingProduct {
  purchaseLink: string;
}

export interface UserShoppingProfile {
  demographics: {
    ageGroup?: '20대' | '30대' | '40대' | '50대+';
    lifestyle?: '1인가구' | '신혼' | '육아중' | '실버세대';
    budgetLevel?: 'economy' | 'standard' | 'premium';
  };
  purchaseBehavior: {
    priceSensitivity: number; // 0-1
    brandLoyalty: number; // 0-1
    varietySeeking: number; // 0-1
    bulkBuying: boolean;
  };
  foodPreferences: {
    spicyLevel?: 1 | 2 | 3 | 4 | 5;
    dietaryRestrictions?: string[];
    favoriteCategories?: string[];
    avoidCategories?: string[];
  };
  contextualNeeds: {
    currentMood?: string;
    healthGoals?: string[];
    upcomingEvents?: string[];
    seasonalPreferences?: Map<string, string[]>;
  };
}

export class ShoppingAPIClient {
  private baseUrl = 'http://recovershop.co.kr/v2/searchapi';

  // Emotion-based product mappings
  private emotionProducts: Record<string, string[]> = {
    '스트레스': ['초콜릿', '아이스크림', '과자', '맥주', '치킨'],
    '피곤': ['비타민', '에너지드링크', '커피', '영양제'],
    '우울': ['초콜릿', '케이크', '아이스크림', '피자'],
    '기쁨': ['와인', '케이크', '스낵', '음료'],
    '건강관심': ['샐러드', '요거트', '견과류', '과일'],
    '다이어트': ['샐러드', '닭가슴살', '곤약', '두부'],
    '야식': ['라면', '치킨', '떡볶이', '맥주']
  };

  // Time-based recommendations
  private timeBasedProducts: Record<string, string[]> = {
    '아침': ['우유', '빵', '요거트', '시리얼', '커피'],
    '점심': ['도시락', '김밥', '샌드위치', '샐러드'],
    '저녁': ['라면', '즉석밥', '레토르트', '냉동식품'],
    '야식': ['라면', '과자', '맥주', '아이스크림'],
    '주말': ['고기', '와인', '과자', '맥주', '피자']
  };

  async searchProducts(query: string): Promise<ShoppingProduct[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}?search=${encodedQuery}`;

      console.log(`[ShoppingAPI] Searching for: ${query}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.error(`[ShoppingAPI] Error: ${response.status}`);
        return [];
      }

      const data: ShoppingProduct[] = await response.json();
      console.log(`[ShoppingAPI] Found ${data.length} products`);

      return data;
    } catch (error) {
      console.error('[ShoppingAPI] Search failed:', error);
      return [];
    }
  }

  // Calculate personalized recommendation score
  calculateRecommendationScore(
    product: ShoppingProduct,
    userProfile: Partial<UserShoppingProfile>,
    context: { mood?: string; timeOfDay?: string; query?: string }
  ): number {
    let score = 0;

    // 1. Relevance score (30%)
    if (context.query) {
      const relevance = this.calculateRelevance(product.name, context.query);
      score += relevance * 0.3;
    }

    // 2. Preference score (30%)
    if (userProfile.foodPreferences?.favoriteCategories?.includes(product.category.category_name)) {
      score += 0.3;
    }

    // 3. Price sensitivity score (20%)
    if (userProfile.purchaseBehavior) {
      const priceScore = this.calculatePriceScore(product.price, userProfile.purchaseBehavior.priceSensitivity);
      score += priceScore * 0.2;
    }

    // 4. Context score (20%)
    if (context.mood && this.emotionProducts[context.mood]) {
      const moodProducts = this.emotionProducts[context.mood];
      if (moodProducts.some(p => product.name.includes(p))) {
        score += 0.2;
      }
    }

    return Math.min(score, 1); // Normalize to 0-1
  }

  private calculateRelevance(productName: string, query: string): number {
    const lowerProduct = productName.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerProduct.includes(lowerQuery)) return 1;

    const queryWords = lowerQuery.split(' ');
    const matches = queryWords.filter(word => lowerProduct.includes(word)).length;
    return matches / queryWords.length;
  }

  private calculatePriceScore(price: number, priceSensitivity: number): number {
    // Lower price gets higher score for price-sensitive users
    const maxPrice = 50000;
    const normalizedPrice = Math.min(price / maxPrice, 1);
    return 1 - (normalizedPrice * priceSensitivity);
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations(
    query: string,
    userProfile: Partial<UserShoppingProfile>,
    context: { mood?: string; timeOfDay?: string }
  ): Promise<{
    products: ShoppingProduct[];
    reasoning: string;
  }> {
    // Search for products
    let products = await this.searchProducts(query);

    // If no direct results, try context-based search
    if (products.length === 0 && (context.mood || context.timeOfDay)) {
      const contextQuery = this.getContextQuery(context);
      if (contextQuery) {
        products = await this.searchProducts(contextQuery);
      }
    }

    // Score and sort products
    const scoredProducts = products.map(product => ({
      ...product,
      score: this.calculateRecommendationScore(product, userProfile, { ...context, query })
    }));

    scoredProducts.sort((a, b) => b.score - a.score);

    // Diversify recommendations
    const diversified = this.diversifyRecommendations(scoredProducts, userProfile);

    // Generate reasoning
    const reasoning = this.generateRecommendationReasoning(diversified, userProfile, context);

    return {
      products: diversified,
      reasoning
    };
  }

  private getContextQuery(context: { mood?: string; timeOfDay?: string }): string | null {
    if (context.mood && this.emotionProducts[context.mood]) {
      return this.emotionProducts[context.mood][0];
    }
    if (context.timeOfDay && this.timeBasedProducts[context.timeOfDay]) {
      return this.timeBasedProducts[context.timeOfDay][0];
    }
    return null;
  }

  private diversifyRecommendations(
    products: (ShoppingProduct & { score: number })[],
    userProfile: Partial<UserShoppingProfile>
  ): ShoppingProduct[] {
    const result: ShoppingProduct[] = [];

    // Top matches (2)
    result.push(...products.slice(0, 2));

    // Value for money (1)
    const sortedByValue = [...products].sort((a, b) => {
      const valueA = a.score / Math.max(a.price, 1);
      const valueB = b.score / Math.max(b.price, 1);
      return valueB - valueA;
    });
    if (sortedByValue[0] && !result.includes(sortedByValue[0])) {
      result.push(sortedByValue[0]);
    }

    // New discovery (1)
    if (userProfile.purchaseBehavior?.varietySeeking && userProfile.purchaseBehavior.varietySeeking > 0.5) {
      const newProduct = products.find(p => !result.includes(p) && p.score > 0.3);
      if (newProduct) result.push(newProduct);
    }

    // Premium option (1)
    const premiumProducts = products.filter(p => p.price > 30000 && !result.includes(p));
    if (premiumProducts.length > 0) {
      result.push(premiumProducts[0]);
    }

    return result.slice(0, 5); // Return top 5
  }

  private generateRecommendationReasoning(
    products: ShoppingProduct[],
    userProfile: Partial<UserShoppingProfile>,
    context: { mood?: string; timeOfDay?: string }
  ): string {
    const reasons: string[] = [];

    if (context.mood) {
      reasons.push(`${context.mood} 상태에 딱 맞는 상품들을 골랐어요`);
    }

    if (context.timeOfDay) {
      reasons.push(`${context.timeOfDay} 시간대에 인기 있는 상품들이에요`);
    }

    if (userProfile.demographics?.lifestyle === '1인가구') {
      reasons.push('1인분에 적합한 상품 위주로 추천드려요');
    }

    if (userProfile.purchaseBehavior?.priceSensitivity && userProfile.purchaseBehavior.priceSensitivity > 0.7) {
      reasons.push('가성비 좋은 상품들을 우선 추천했어요');
    }

    const freeShippingCount = products.filter(p => p.shipping_fee === 0).length;
    if (freeShippingCount > 0) {
      reasons.push(`${freeShippingCount}개 상품은 무료배송이에요`);
    }

    return reasons.length > 0 ? reasons.join('. ') : '고객님께 맞는 최적의 상품을 추천드립니다';
  }

  // Generate purchase link for a product
  generatePurchaseLink(product: ShoppingProduct): string {
    // Since RecoverShop doesn't have direct product pages,
    // link to the main site with search for the product name
    // Users can then find and purchase the product
    const encodedName = encodeURIComponent(product.name);
    return `http://recovershop.co.kr/?search=${encodedName}`;
  }

  // Format for chat response with images and detailed product info
  formatProductsForChat(products: ShoppingProduct[], reasoning?: string): string {
    if (products.length === 0) {
      return '죄송해요, 관련 상품을 찾을 수 없어요. 다른 검색어로 시도해보세요.';
    }

    let response = '';

    // Add mood-based greeting if reasoning is provided
    if (reasoning) {
      response += `${reasoning}\n\n`;
    }

    response += '## 🛒 추천 상품\n\n';

    products.slice(0, 4).forEach((product, index) => {
      const ranking = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐';

      // Add product image if available
      if (product.image) {
        // Use proxy to handle CORS issues
        const proxiedImageUrl = `http://localhost:3001/api/image-proxy?url=${encodeURIComponent(product.image)}`;
        response += `![${product.name}](${proxiedImageUrl})\n\n`;
      }

      // Product title and price
      response += `### ${ranking} ${product.name}\n\n`;
      response += `**💰 ${product.price.toLocaleString()}원**`;

      if (product.shipping_fee === 0) {
        response += ' `무료배송`';
      }

      // Stock status
      if (product.stock > 0 && product.stock < 10) {
        response += ' `⚠️ 품절임박`';
      } else if (product.stock > 50) {
        response += ' `✅ 재고충분`';
      }

      response += '\n\n';

      // Additional details in a clean format
      const details = [];

      if (product.category) {
        details.push(`카테고리: ${product.category.category_name}`);
      }

      if (product.minimum_order_quantity > 1) {
        details.push(`최소주문: ${product.minimum_order_quantity}개`);
      }

      if (details.length > 0) {
        response += `📋 ${details.join(' | ')}\n\n`;
      }

      // Add purchase hint for top product
      if (index === 0) {
        response += '> 💡 **베스트 상품** - 가장 많이 찾는 인기 상품이에요!\n\n';
      }

      // Add separator except for last item
      if (index < Math.min(3, products.length - 1)) {
        response += '---\n\n';
      }
    });

    // Purchase guide with better formatting
    response += '\n---\n\n';
    response += '### 💳 구매 방법\n\n';
    response += '1. **[RecoverShop 바로가기 →](http://recovershop.co.kr)**\n';
    response += '2. 로그인 → 상품명 검색 → 구매\n';
    response += '3. 모든 상품 **무료배송** 혜택!\n\n';
    response += '> 궁금한 점이 있으시면 언제든 물어보세요! 😊';

    return response;
  }

  // Detect shopping intent from message
  detectShoppingIntent(message: string): {
    hasIntent: boolean;
    searchQuery: string | null;
    mood?: string;
    timeContext?: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Shopping keywords
    const shoppingKeywords = ['구매', '사고싶', '추천', '뭐먹', '배고프', '먹을거', '장보기', '쇼핑'];
    const hasShoppingKeyword = shoppingKeywords.some(keyword => message.includes(keyword));

    // Food keywords
    const foodKeywords = ['라면', '과자', '음료', '커피', '빵', '김치', '고기', '과일', '야식', '간식'];
    const foundFood = foodKeywords.find(food => message.includes(food));

    // Mood detection
    const moods: Record<string, string[]> = {
      '스트레스': ['스트레스', '짜증', '힘들'],
      '피곤': ['피곤', '졸려', '지쳐'],
      '우울': ['우울', '슬퍼', '외로워'],
      '기쁨': ['기뻐', '좋아', '신나']
    };

    let detectedMood: string | undefined;
    for (const [mood, keywords] of Object.entries(moods)) {
      if (keywords.some(k => message.includes(k))) {
        detectedMood = mood;
        break;
      }
    }

    // Time context
    let timeContext: string | undefined;
    if (message.includes('아침')) timeContext = '아침';
    else if (message.includes('점심')) timeContext = '점심';
    else if (message.includes('저녁')) timeContext = '저녁';
    else if (message.includes('야식')) timeContext = '야식';

    // Determine if there's shopping intent
    const hasIntent = hasShoppingKeyword || !!foundFood || !!detectedMood || !!timeContext;

    return {
      hasIntent,
      searchQuery: foundFood || (hasShoppingKeyword ? message : null),
      mood: detectedMood,
      timeContext
    };
  }
}

// Singleton instance
let shoppingClient: ShoppingAPIClient | null = null;

export function getShoppingAPIClient(): ShoppingAPIClient {
  if (!shoppingClient) {
    shoppingClient = new ShoppingAPIClient();
  }
  return shoppingClient;
}