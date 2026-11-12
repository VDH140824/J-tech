package com.jtech.controller;

import com.jtech.dto.response.SpeakingResponses.Scenario;
import com.jtech.dto.response.SpeakingResponses.SessionResult;
import com.jtech.dto.response.SpeakingResponses.SessionStarted;
import com.jtech.dto.response.SpeakingResponses.TurnResult;
import com.jtech.service.SpeakingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

/** AI speaking practice for learners. The frontend contract is frontend/api/speakingApi.ts. */
@RestController
@RequestMapping("/student")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentSpeakingController {
    private final SpeakingService speaking;

    public StudentSpeakingController(SpeakingService speaking) { this.speaking = speaking; }

    @GetMapping("/chapters/{chapterId}/speaking-scenarios")
    public List<Scenario> scenarios(@PathVariable long chapterId, Principal principal) {
        return speaking.scenarios(chapterId, principal.getName());
    }

    @PostMapping("/speaking-scenarios/{scenarioId}/sessions")
    /** {@code swapped=true} lets the learner play the AI role of the scenario. */
    public SessionStarted start(@PathVariable long scenarioId,
            @RequestParam(defaultValue = "false") boolean swapped, Principal principal) {
        return speaking.start(scenarioId, swapped, principal.getName());
    }

    /** {@code audio} is a 16 kHz mono 16-bit PCM WAV recording of one learner line. */
    @PostMapping("/speaking-sessions/{sessionId}/turns")
    public TurnResult submitTurn(@PathVariable long sessionId, @RequestParam int lineIndex,
            @RequestParam MultipartFile audio, Principal principal) throws IOException {
        return speaking.submitTurn(sessionId, lineIndex, audio.getBytes(), principal.getName());
    }

    @PostMapping("/speaking-sessions/{sessionId}/finish")
    public SessionResult finish(@PathVariable long sessionId, Principal principal) {
        return speaking.finish(sessionId, principal.getName());
    }

    @GetMapping("/speaking-sessions/{sessionId}")
    public SessionResult get(@PathVariable long sessionId, Principal principal) {
        return speaking.get(sessionId, principal.getName());
    }
}
