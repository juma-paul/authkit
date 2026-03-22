import { pool, connectDatabase } from "../../config/database";

describe("Database", () => {
  it("should connect successfully", async () => {
    const result = await pool.query("SELECT 1");
    expect(result.rows).toHaveLength(1);
  });

  it("should log success when connected", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    
    await connectDatabase();

    expect(consoleSpy).toHaveBeenCalledWith("Database connected successfully!");
    consoleSpy.mockRestore();
  });

  it("should handle connection failure gracefully", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    jest
      .spyOn(pool, "query")
      .mockRejectedValueOnce(new Error("Connection failed") as never);

    await connectDatabase();

    expect(errorSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
