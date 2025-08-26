import { FastifyInstance, FastifyPluginOptions } from 'fastify';

import fastifyPlugin from 'fastify-plugin';
import question from './question';
import user from './user';
import quiz from './quiz';

const getOptionsWithPrefix = (options: FastifyPluginOptions, prefix: string) => {
	return {
		...options,
		prefix: options.prefix + prefix,
	};
};

export default fastifyPlugin(async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
	fastify.get('/api/health', async () => {
		return { status: 'OK' };
	});

	await Promise.all([fastify.register(question, getOptionsWithPrefix(options, '/questions'))]);
	await Promise.all([fastify.register(quiz, getOptionsWithPrefix(options, '/quiz'))]);
	await Promise.all([fastify.register(user, getOptionsWithPrefix(options, '/users'))]);
});
