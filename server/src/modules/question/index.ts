import { FastifyInstance, FastifyPluginOptions } from 'fastify';

import fastifyPlugin from 'fastify-plugin';
import questionRoute from './question.route';
import { QuestionResponse } from './question.schema';

export default fastifyPlugin(async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
	fastify.addSchema(QuestionResponse);

	await fastify.register(questionRoute, options);
});
