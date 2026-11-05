import java.nio.file.*;
import java.sql.*;
import java.util.regex.*;
public class FeedbackSchemaReadOnlyProbe {
  static String value(String text,String key){
    var m=Pattern.compile("(?m)^\\s*"+key+":\\s*(.*?)\\s*$").matcher(text);
    if(!m.find())throw new IllegalArgumentException("Missing configuration key");
    String s=m.group(1).trim();
    if(s.length()>1&&((s.startsWith("\"")&&s.endsWith("\""))||(s.startsWith("'")&&s.endsWith("'"))))s=s.substring(1,s.length()-1);
    return s;
  }
  public static void main(String[] args)throws Exception{
    String yaml=Files.readString(Path.of("backend/src/main/resources/application.yml"));
    DriverManager.setLoginTimeout(5);
    try(var c=DriverManager.getConnection(value(yaml,"url")+"&connectTimeout=5000&socketTimeout=5000",value(yaml,"username"),value(yaml,"password"))){
      c.setReadOnly(true);
      try(var p=c.prepareStatement("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='feedback' ORDER BY ORDINAL_POSITION");var r=p.executeQuery()){
        while(r.next())System.out.println(r.getString(1)+" | "+r.getString(2)+" | nullable="+r.getString(3)+" | default="+r.getString(4));
      }
    }catch(SQLException e){System.out.println("DATABASE_CHECK_FAILED SQLState="+e.getSQLState()+" code="+e.getErrorCode());System.exit(1);}
  }
}
