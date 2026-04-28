export function createLineStream(): TransformStream<string, string> {
  let buffer = "";
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      // Normalise line endings: handle \r\n, \n, and \r as separators.
      const parts = buffer.split(/\r\n|\n|\r/);
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        if (line.length > 0) controller.enqueue(line);
      }
    },
    flush(controller) {
      if (buffer.length > 0) {
        controller.enqueue(buffer);
        buffer = "";
      }
    },
  });
}
