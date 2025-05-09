import fs from 'fs';
import path from 'path';

class RoleManager {
  constructor(templatesDir, generatedDir) {
    this.templatesDir = templatesDir || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../roles/templates');
    this.generatedDir = generatedDir || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../profiles/generated');
  }

  generateRoles(roleNames) {
    if (!fs.existsSync(this.generatedDir)) {
      fs.mkdirSync(this.generatedDir, { recursive: true });
    }

    roleNames.forEach((roleName) => {
      const templatePath = path.join(this.templatesDir, `${roleName}.json`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template for role '${roleName}' not found at ${templatePath}`);
      }

      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const replacedContent = templateContent.replace(/\$NAME/g, roleName);

      let jsonData;
      try {
        jsonData = JSON.parse(replacedContent);
      } catch (err) {
        throw new Error(
          `Invalid JSON after replacing placeholders for role '${roleName}': ${err.message}`
        );
      }

      const outputPath = path.join(this.generatedDir, `${roleName}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    });
  }

  getGeneratedProfilePaths() {
    if (!fs.existsSync(this.generatedDir)) {
      return [];
    }

    return fs
      .readdirSync(this.generatedDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join(this.generatedDir, file));
  }
}

export { RoleManager };
export default RoleManager;
