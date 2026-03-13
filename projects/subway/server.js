import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available ingredients for reference (to keep AI grounded)
const SUBWAY_MENU = {
  breads: ['화이트', '하티', '파마산 오레가노', '위트', '허니 오트', '플랫브레드'],
  meats: ['치킨 데리야끼', '로스트 치킨', '로티세리 바비큐 치킨', '이탈리안 비엠티', '비엘티', '미트볼', '참치', '햄', '에그마요', '폴드포크 바비큐', '스테이크 & 치즈', '스파이시 이탈리안'],
  cheeses: ['아메리칸 치즈', '슈레드 치즈', '모짜렐라 치즈'],
  veggies: ['양상추', '토마토', '오이', '피망', '양파', '피클', '올리브', '할라피뇨'],
  sauces: ['랜치', '마요네즈', '스위트 어니언', '허니 머스타드', '스위트 칠리', '핫 칠리', '사우스웨스트 치폴레', '머스타드', '홀스래디쉬', '올리브 오일', '레드와인 식초', '소금', '후추'],
  cookies: ['더블 초코칩', '초코칩', '오트밀 레이즌', '라즈베리 치즈케익', '화이트 초코 마카다미아'],
  drinks: ['코카콜라', '코가콜라 제로', '스프라이트', '닥터페퍼', '생수']
};

app.post('/api/customer/generate', async (req, res) => {
  try {
    const prompt = `
당신은 서브웨이 샌드위치 매장을 방문한 인공지능 손님입니다.
가상의 캐릭터 설정(성격, 말투, 현재 기분 등)을 하나 무작위로 정하세요.
그리고 다음 서브웨이 메뉴 목록에서 본인이 원하는 조합을 하나 정해서 주문해주세요.

[서브웨이 메뉴]
빵: ${SUBWAY_MENU.breads.join(', ')}
메인 토핑(고기류): ${SUBWAY_MENU.meats.join(', ')}
치즈: ${SUBWAY_MENU.cheeses.join(', ')}
야채: ${SUBWAY_MENU.veggies.join(', ')} (뺄 야채나 추가할 야채를 구체적으로 자유롭게 말해도 됩니다)
소스: ${SUBWAY_MENU.sauces.join(', ')}
쿠키: ${SUBWAY_MENU.cookies.join(', ')}
음료: ${SUBWAY_MENU.drinks.join(', ')}

[주문 규칙]
1. 빵을 구울지(toasted) 말지 결정하세요.
2. 쿠키나 음료는 필수는 아니지만, 배가 고프거나 세트를 원하면 주문할 수 있습니다.
3. 캐릭터 설정에 맞게 매우 까다롭거나, 아주 관대하거나, 급하거나, 소심하게 주문하세요.

[출력 형식]
반드시 다음 JSON 형식으로만 출력하세요.
{
  "name": "손님 이름 또는 특징",
  "personality": "캐릭터 성격/기분 설명",
  "dialogue": "종업원에게 건네는 주문 대사 (자연스럽게)",
  "exact_order": {
    "bread": "빵 이름",
    "is_toasted": true 또는 false,
    "meat": "메인 토핑",
    "cheese": "치즈 이름",
    "veggies": ["포함할 야채 목록"],
    "sauces": ["소스 목록"],
    "cookie": "쿠키 이름 또는 null",
    "drink": "음름 이름 또는 null"
  }
}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You are a realistic Subway customer." }, { role: "user", content: prompt }],
      temperature: 0.9,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(response.choices[0].message.content);
    res.json(data);
  } catch (error) {
    console.error("Error generating customer:", error);
    res.status(500).json({ error: "손님 생성 중 오류가 발생했습니다." });
  }
});

app.post('/api/customer/evaluate', async (req, res) => {
  try {
    const { customerData, playerSandwich } = req.body;

    const prompt = `
당신은 방금 서브웨이 주문을 마친 손님 '${customerData.name}' 입니다. 
캐릭터 설정: ${customerData.personality}

[당신의 주문 내역]
빵: ${customerData.exact_order.bread} (${customerData.exact_order.is_toasted ? '구움' : '안 구움'})
고기: ${customerData.exact_order.meat}
치즈: ${customerData.exact_order.cheese}
야채: ${customerData.exact_order.veggies.join(', ')}
소스: ${customerData.exact_order.sauces.join(', ')}
쿠키: ${customerData.exact_order.cookie || '없음'}
음료: ${customerData.exact_order.drink || '없음'}

[종업원이 제공한 실제 내역]
빵: ${playerSandwich.bread} (${playerSandwich.is_toasted ? '구움' : '안 구움'})
고기: ${playerSandwich.meat}
치즈: ${playerSandwich.cheese}
야채: ${playerSandwich.veggies.join(', ')}
소스: ${playerSandwich.sauces.join(', ')}
쿠키: ${playerSandwich.cookie || '없음'}
음료: ${playerSandwich.drink || '없음'}

이 둘을 비교하여 0~100점 사이로 점수를 매기고, 성격에 맞는 대사로 피드백하세요.
빵 굽기(Toasted) 여부가 틀리면 감점이 큽니다. 쿠키나 음료를 빼먹어도 감점입니다.

[출력 형식]
{
  "score": 점수(숫자),
  "feedback": "피드백 대사"
}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You evaluate the service." }, { role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(response.choices[0].message.content);
    res.json(data);
  } catch (error) {
    console.error("Error evaluating order:", error);
    res.status(500).json({ error: "주문 평가 중 오류가 발생했습니다." });
  }
});


app.listen(port, () => {
  console.log(`서브웨이 게임 시뮬레이터 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
