import com.jtech.JTechApplication;
import com.jtech.repository.VocabularyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
public class VocabularySchemaProbe {
  public static void main(String[] args) throws Exception {
    try (var context = SpringApplication.run(JTechApplication.class, "--server.port=0", "--logging.level.org.springframework.security=WARN")) {
      var words = context.getBean(VocabularyRepository.class).findAll();
      var json = context.getBean(ObjectMapper.class).writeValueAsString(words);
      if (json.contains("\"audioUrl\"") || json.contains("\"audioPublicId\"")) throw new IllegalStateException("Obsolete fields in response");
      System.out.println("VOCABULARY_SCHEMA_OK records=" + words.size());
    }
  }
}
