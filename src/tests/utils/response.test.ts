import { sendSuccess, sendError } from "../../utils/response";
import { NotFoundError } from "../../errors/AppError";

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

describe("Response Utilities", () => {
  describe("sendSuccess", () => {
    it("should return correct structure with default 200 status", () => {
      const res = mockRes();
      sendSuccess(res, { name: "Juma" });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        statusCode: 200,
        data: { name: "Juma" },
      });
    });

    it("should return correct structure with custom status code", () => {
      const res = mockRes();
      sendSuccess(res, { name: "Paul" }, 201);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("sendError", () => {
    it("should return correct error structure", () => {
      const res = mockRes();
      sendError(res, new NotFoundError("User not found"));

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 404,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    });
  });
});
