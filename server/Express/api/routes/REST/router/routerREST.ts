import { Router } from "express";
import chatRESTController from "../controllers/ChatRESTController";
import userRESTController from "../controllers/UserRESTController";
import authRESTController from "../controllers/AuthRESTController";
import uploadRESTController from "../controllers/UploadRESTController";
import { errorHandlerRESTMiddleware } from "../middleware/errorHandlerRESTMiddleware";

const routerREST = Router();

// Controllers/routes
routerREST.use("/chat", chatRESTController);
routerREST.use("/user", userRESTController);
routerREST.use("/auth", authRESTController);
routerREST.use("/upload", uploadRESTController);

// Global REST error handler (must be last)
routerREST.use(errorHandlerRESTMiddleware);

export default routerREST;
