import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import patientRoute from './patient.route';
import { PatientSchemas } from './patient.schema';

export default fastifyPlugin(async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
	// Register all patient schemas for validation and documentation
	Object.entries(PatientSchemas).forEach(([name, schema]) => {
		fastify.addSchema(schema);
	});

	// Register patient routes
	await fastify.register(patientRoute, options);

	// Add global error handler for patient module
	fastify.setErrorHandler((error, request, reply) => {
		// Log error for debugging
		console.error(`[${new Date().toISOString()}] Patient module error:`, {
			error: error.message,
			stack: error.stack,
			url: request.url,
			method: request.method,
			ip: request.ip,
		});

		// Send appropriate error response
		if (error.statusCode) {
			reply.status(error.statusCode).send({
				success: false,
				error: error.name || "Error",
				message: error.message,
				timestamp: new Date().toISOString(),
				requestId: request.id,
			});
		} else {
			reply.status(500).send({
				success: false,
				error: "Internal Server Error",
				message: "An unexpected error occurred in the patient module",
				timestamp: new Date().toISOString(),
				requestId: request.id,
			});
		}
	});
});
