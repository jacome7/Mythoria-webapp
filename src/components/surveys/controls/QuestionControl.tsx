'use client';

import type { AnswerValue, SurveyQuestion } from '@/lib/surveys/definition-schema';
import ChoiceButtons from './ChoiceButtons';
import LongText from './LongText';
import MultiChoice from './MultiChoice';
import NumberInput from './NumberInput';
import Select from './Select';
import ShortText from './ShortText';
import Slider from './Slider';
import Smileys from './Smileys';
import SingleChoice from './SingleChoice';
import StaticContent from './StaticContent';
import Stars from './Stars';

interface QuestionControlProps {
  question: SurveyQuestion;
  locale: string;
  value: AnswerValue | undefined;
  onChange: (question: SurveyQuestion, value: AnswerValue | undefined) => void;
  error?: string;
}

/** Picks the control for a question type. */
export default function QuestionControl({
  question,
  locale,
  value,
  onChange,
  error,
}: QuestionControlProps) {
  const common = {
    locale,
    value,
    error,
    onChange: (next: AnswerValue | undefined) => onChange(question, next),
  };

  switch (question.type) {
    case 'single_choice':
      return <SingleChoice question={question} {...common} />;
    case 'multi_choice':
      return <MultiChoice question={question} {...common} />;
    case 'buttons':
      return <ChoiceButtons question={question} {...common} />;
    case 'short_text':
      return <ShortText question={question} {...common} />;
    case 'long_text':
      return <LongText question={question} {...common} />;
    case 'number':
      return <NumberInput question={question} {...common} />;
    case 'slider':
      return <Slider question={question} {...common} />;
    case 'stars':
      return <Stars question={question} {...common} />;
    case 'smileys':
      return <Smileys question={question} {...common} />;
    case 'select':
      return <Select question={question} {...common} />;
    case 'static_content':
      return <StaticContent question={question} locale={locale} />;
  }
}
