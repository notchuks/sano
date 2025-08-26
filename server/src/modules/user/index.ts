import { FastifyInstance, FastifyPluginOptions } from 'fastify';

import fastifyPlugin from 'fastify-plugin';
import userRoute from './user.route';
import { UserSchema } from './user.schema';

export default fastifyPlugin(async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
	fastify.addSchema(UserSchema);

	await fastify.register(userRoute, options);
});
