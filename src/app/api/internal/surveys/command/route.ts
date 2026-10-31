import {
  executeSurveyCommand,
  surveyCommandSchema,
  surveyHttpError,
  surveyJson,
  verifySurveyServiceIdentity,
} from '@/lib/surveys/admin-api';
import { SurveyAdminError } from '@/lib/surveys/errors';
import { surveyLogger } from '@/lib/surveys/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const caller = await verifySurveyServiceIdentity(request, 'admin');
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SurveyAdminError('invalid_json', 'Request body must be valid JSON', 400);
    }
    const command = surveyCommandSchema.parse(body);
    surveyLogger.info('survey_command', {
      operation: command.operation,
      actorEmail: command.actor.email,
      caller,
    });
    return surveyJson({ data: (await executeSurveyCommand(command)) ?? { success: true } });
  } catch (error) {
    return surveyHttpError(error);
  }
}
