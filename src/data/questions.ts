export type QuestionKind = "text" | "choice" | "message";

export type ChoiceOption = {
  id: string;
  label: string;
};

export type Question = {
  id: string;
  kind: QuestionKind;
  ilkin: string;
  fidan: string;
  options?: ChoiceOption[];
};

function both(text: string): Pick<Question, "ilkin" | "fidan"> {
  return { ilkin: text, fidan: text };
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    kind: "choice",
    ...both("Bu ikisindən olar?"),
    options: [
      { id: "A", label: "A) 100%" },
      { id: "B", label: "B) A" },
      { id: "C", label: "C) B" },
      { id: "D", label: "D) C" },
    ],
  },
  {
    id: "q2",
    kind: "text",
    ilkin: "Fidanı ilk dəfə görəndə nə hiss keçirdin?",
    fidan: "İlkini ilk dəfə görəndə nə hiss keçirdin?",
  },
  {
    id: "q3",
    kind: "text",
    ilkin: "Fidanın nəyini sevirsən?",
    fidan: "İlkinin hansı cəhətini xoşlayırsan?",
  },
  {
    id: "q4",
    kind: "text",
    ilkin: "Nə vaxta kimi Fidanın arxasınca gedəcəksən?",
    fidan: "İlkini nə qədər süründürəcəksən?",
  },
  {
    id: "q5",
    kind: "text",
    ilkin: "Fidanın ən çox nəyi səni əsəbləşdirir?",
    fidan: "İlkinin ən çox nəyi səni əsəbləşdirir?",
  },
  {
    id: "q6",
    kind: "text",
    ...both("İkinizin birlikdə keçirdiyi bir günün olmasını istəsəydin, o gün necə keçərdi?"),
  },
  {
    id: "q24",
    kind: "text",
    ilkin: "Səncə Fidanın ən xoşladığı aktivitə-hobbi nədir?",
    fidan: "Səncə İlkinin ən xoşladığı aktivitə-hobbi nədir?",
  },
  {
    id: "q25",
    kind: "text",
    ilkin: "Səncə Fidan stressli olanda nə etməyi daha çox sevir?",
    fidan: "Səncə İlkin stressli olanda nə etməyi daha çox sevir?",
  },
  {
    id: "q11",
    kind: "text",
    ...both("Birlikdə ən xoş xatirəniz hansıdır?"),
  },
  {
    id: "q12",
    kind: "text",
    ...both("İkinizdən kim daha çox inadkardır?"),
  },
  {
    id: "q13",
    kind: "text",
    ...both("İkinizdən hansı ilk addımı atmağa daha çox çəkinir?"),
  },
  {
    id: "q14",
    kind: "text",
    ...both("İkinizdən hansı digərini daha çox təəccübləndirə bilər?"),
  },
  {
    id: "q15",
    kind: "text",
    ilkin: "Fidanın sizinlə bağlı ən çox istifadə etdiyi söz hansıdır?",
    fidan: "İlkinin sizinlə bağlı ən çox istifadə etdiyi söz hansıdır?",
  },
  {
    id: "q16",
    kind: "text",
    ...both("İkinizdən kim “mən də ona yazmayacam” deyib, sonda yenə yazardı?"),
  },
  {
    id: "q18",
    kind: "text",
    ilkin: "Fidan qərar verəndə daha çox ürəyinə, yoxsa ağlına qulaq asır?",
    fidan: "İlkin qərar verəndə daha çox ürəyinə, yoxsa ağlına qulaq asır?",
  },
  {
    id: "q7",
    kind: "text",
    ilkin: "Fidana qarşı ən güclü hissin nədir?",
    fidan: "İlkinin səndə yaratdığı ən güclü hiss nədir?",
  },
  {
    id: "q8",
    kind: "text",
    ...both("Niyə yola getmirsiniz?"),
  },
  {
    id: "q9",
    kind: "text",
    ilkin: "Fidanın səninlə bağlı hissləri nədir?",
    fidan: "İlkin səni nə qədər sevir?",
  },
  {
    id: "q10",
    kind: "text",
    ...both("Sizin vəziyyətinizi təsvir edəcək hansı əsər və ya film deyə bilərsiniz?"),
  },
  {
    id: "q19",
    kind: "text",
    ilkin: "Fidanla bağlı nəyisə dəyişmək imkanın olsaydı, nəyi dəyişərdin?",
    fidan: "İlkinlə bağlı nəyisə dəyişmək imkanın olsaydı, nəyi dəyişərdin?",
  },
  {
    id: "q20",
    kind: "text",
    ...both("Sözlə demək, yoxsa çabayla göstərmək?"),
  },
  {
    id: "q21",
    kind: "text",
    ...both("Nə vaxt normal danışacaqsınız?"),
  },
  {
    id: "q22",
    kind: "text",
    ...both("Bəs indikinin əksinə, ikinizin də hissi qarşılıqlı olsa, necə olardı?"),
  },
  {
    id: "q23",
    kind: "message",
    ...both("Allah ikinizə də ağıl versin"),
  },
];

export function questionAt(index: number): Question | undefined {
  return QUESTIONS[index];
}

export function isFinaleIndex(index: number): boolean {
  return QUESTIONS.length === 0 || index >= QUESTIONS.length;
}
