export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_form';
        if (!fields[key]) fields[key] = [];
        fields[key].push(issue.message);
      }
      return res.status(400).json({ error: 'Validation failed', fields });
    }
    req.body = result.data;
    next();
  };
}
