package com.tungnq23.quiz_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.profiles.active=test",
		"spring.datasource.url=jdbc:h2:mem:quiz;MODE=Oracle;DB_CLOSE_DELAY=-1",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop"
})
class QuizApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
