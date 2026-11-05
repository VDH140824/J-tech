// Proposed method signatures; business behavior is traced to the supplied SRS.
const pages=structuredClone(require('./english-data.cjs'));
const definitions={
'11.1':{names:['StudentGameSelectionPage','gameApi.ts','GameController','GameService','GameRepository','CurriculumRepository','GameContentRepository'],calls:{
2:'listGames() => games: List<GameSummary>',4:'listGames(studentId) => games: List<GameSummary>',5:'findAvailableGames() => games: List<GameSummary>',
12:'listCourses() => courses: List<CourseSummary>',14:'listCourses(studentId) => courses: List<CourseSummary>',15:'findAvailableCourses() => courses: List<CourseSummary>',
22:'showScopeOptions(courseId) => scopeOptions: [LESSON, CHAPTER]',24:'listScopes(courseId, scopeType) => scopes: List<ScopeSummary>',26:'listScopes(studentId, courseId, scopeType) => scopes: List<ScopeSummary>',27:'findScopesByCourse(courseId, scopeType) => scopes: List<ScopeSummary>',
34:'showSupportedContentTypes(game.supportedContentTypes) => contentTypeOptions',36:'prepareGame({gameId, courseId, scopeType, scopeId, contentType}) => setup: GameSetup',38:'prepareGame(studentId, selection) => setup: GameSetup',39:'validateSupportedContentType(gameId, selection.contentType)',40:'findContent(selection.scopeType, selection.scopeId, selection.contentType) => content: List<GameContentItem>',42:'initializeGame(gameId, selection, content) => setup: GameSetup',46:'renderGame(setup)'}},
'11.2':{names:['StudentGamePage','gameApi.ts','GameController','GameService','GameRewardRuleRepository','GameSessionRepository','CoinRewardService'],calls:{
2:'evaluateAction(sessionState, action) => actionResult: GameActionResult',3:'checkAction(sessionState.content, action) => correctness: AnswerCheck',4:'updateCurrentScore(sessionState, correctness) => score: CurrentScore',8:'endIncompleteSession(sessionState)',9:'skipCompletionReward(sessionState)',
12:'completeGame({sessionId, submittedActions}) => result: GameResult',13:'completeGame(request, authentication) => result: GameResult',14:'completeGame(studentId, request) => result: GameResult',15:'calculateFinalResult(sessionState, submittedActions) => evaluation: GameEvaluation',16:'findRewardRule(gameId) => rewardRule: GameRewardRule',18:'isRewardEligible(evaluation, rewardRule) => eligible: boolean',19:'awardCoins(studentId, activityRef, rewardRule) => award: CoinAwardResult',21:'setCoinsEarned(0)',22:'save(GameSession{studentId, gameId, scope, contentType, score, correctCount, coinsEarned, incorrectAnswers}) => savedSession: GameSession',27:'renderAnswerReview(result.answers, result.incorrectAnswers, result.explanations)'}},
'11.3':{names:['StudentGameHistoryPage','gameApi.ts','GameHistoryController','GameHistoryService','GameSessionRepository'],calls:{
2:'listGameHistory(pageRequest) => history: Page<GameAttemptSummary>',4:'listGameHistory(studentId, pageRequest) => history: Page<GameAttemptSummary>',5:'findCompletedByStudentId(studentId, pageRequest) => history: Page<GameAttemptSummary>',
16:'getGameAttempt(attemptId) => attempt: GameAttemptDetail',18:'getGameAttempt(studentId, attemptId) => attempt: GameAttemptDetail',19:'findCompletedByIdAndStudentId(attemptId, studentId) => attempt: GameAttemptDetail'}},
'12.1':{names:['StudentLearningProgressPage','progressApi.ts','LearningProgressController','LearningProgressService','LearningRecordRepository','PracticeStatisticsRepository','LearningHabitRepository'],calls:{
2:'initializeFilters({period, courseId, chapterId})',4:'getLearningProgress(filters) => progress: LearningProgressDTO',6:'getLearningProgress(studentId, filters) => progress: LearningProgressDTO',7:'findCompletionData(studentId, filters) => completionData: CompletionData',14:'buildNoDataStatistics({activityCounts: 0, practiceResults: null}) => progress: LearningProgressDTO',19:'countFirstLearnedItems(completionData, filters) => knowledge: NewKnowledgeCounts',20:'calculateCompletionPercentage(completedRequiredCount, requiredActivityCount) => completionPercentage: number',21:'setCompletionPercentage(null)',22:'findPracticeStatistics(studentId, filters) => practiceData: PracticeStatisticsData',24:'summarizeAttempts(practiceData.attempts) => attemptStats: AttemptStatistics',25:'findLearningHabits(studentId, filters) => habits: LearningHabitData',27:'calculateActiveStudyTime(habits.activeStudyRecords) => activeStudyTime: Duration'}},
'12.2':{names:['StudentStreakPage','streakApi.ts','StreakController','StreakService','UserStreakRepository','StreakMilestoneRepository'],calls:{
2:'getStreakSummary() => summary: StreakSummary',4:'getStreakSummary(studentId) => summary: StreakSummary',5:'findByStudentId(studentId) => streak: UserStreak',7:'findConfiguredMilestones() => milestones: List<StreakMilestone>',9:'findNextMilestone(streak.currentStreak, milestones) => nextMilestone: Optional<StreakMilestone>'}},
'12.3':{names:['LearningActivityPage','progressApi.ts','LearningActivityController','LearningActivityService','LearningProgressRepository','PracticeAttemptRepository','LearningDayStreakRepository','StreakMilestoneService'],calls:{
2:'recordCompletion(completionRequest) => result: CompletionRecordingResult',4:'recordCompletion(studentId, completionRequest) => result: CompletionRecordingResult',5:'toLearningDate(completionTime, "Asia/Ho_Chi_Minh") => learningDate: LocalDate',6:'findFirstCompletion(studentId, contentType, contentId) => firstCompletion: Optional<CompletionRecord>',8:'saveFirstCompletion(studentId, contentType, contentId, completionTime) => record: CompletionRecord',10:'keepExistingFirstCompletion(firstCompletion)',11:'save(PracticeAttempt{studentId, activityRef, completionTime, score, correctCount, totalQuestions}) => attempt: PracticeAttempt',13:'retainAttemptHistory(attempt)',14:'recordDayAndReadStreak(studentId, learningDate, completionTime) => dayState: LearningDayState',16:'calculateConsecutiveStreak(dayState.learningDays) => streakState: StreakState',17:'updateOnceForDay(studentId, learningDate, streakState) => updatedStreak: UserStreak',19:'findUnrewardedMilestone(studentId, streakState) => milestone: Optional<StreakMilestone>',21:'keepStreakForAlreadyCountedDay(dayState)'}},
'12.4':{names:['DailyStreakResetJob','UserStreakRepository','LearningDayRepository'],calls:{
1:'runDailyReset() — scheduled at 00:00:01 GMT+7',2:'currentDate("Asia/Ho_Chi_Minh") => today: LocalDate',3:'findAll() => streaks: List<UserStreak>',5:'hasQualifyingCompletion(streak.studentId, today.minusDays(1)) => hasCompletion: boolean',7:'keepCurrentStreak(streak)',8:'resetCurrentStreak(streak.studentId, 0) => updatedStreak: UserStreak',10:'preserveStreakUnderBR74(streak)'}},
'13.1':{names:['StudentCoinHistoryPage','coinApi.ts','CoinWalletController','CoinWalletService','CoinTransactionRepository'],calls:{
2:'getWalletHistory(pageRequest) => wallet: WalletHistoryDTO',4:'getWalletHistory(studentId, pageRequest) => wallet: WalletHistoryDTO',5:'findBalanceAndTransactions(studentId, pageRequest, "createdAt DESC") => walletData: WalletHistoryData',21:'getWalletHistory(nextPageRequest) => wallet: WalletHistoryDTO',23:'getWalletHistory(studentId, nextPageRequest) => wallet: WalletHistoryDTO',24:'findTransactionsByStudentId(studentId, nextPageRequest) => transactions: Page<CoinTransaction>',31:'getWalletHistory({pageRequest, dateFilter, direction}) => wallet: WalletHistoryDTO',33:'getWalletHistory(studentId, query) => wallet: WalletHistoryDTO',34:'findTransactionsByStudentIdAndFilter(studentId, query) => transactions: Page<CoinTransaction>',41:'getTransaction(transactionId) => transaction: CoinTransactionDetail',43:'getTransaction(studentId, transactionId) => transaction: CoinTransactionDetail',44:'findByIdAndStudentId(transactionId, studentId) => transaction: Optional<CoinTransaction>'}},
'13.2':{names:['CoinRewardService','CoinTransactionRepository','UserRewardBalanceRepository'],calls:{
1:'awardCoins(studentId, activityRef, rewardRule) => award: CoinAwardResult',2:'resolveAwardKey(studentId, activityRef, rewardRule) => awardKey: IdempotencyKey',3:'findByAwardKey(awardKey) => existingAward: Optional<CoinTransaction>',5:'reuseExistingAward(existingAward)',7:'creditCoinsAndExp(studentId, rewardRule.coins, rewardRule.exp) => balances: RewardBalances',9:'save(CoinTransaction{studentId, direction: EARN, amount, balanceAfter, activityRef, awardKey}) => transaction: CoinTransaction',11:'commitRewardTransaction()',14:'rollbackRewardTransaction()'}},
'14.1':{names:['StudentRewardStorePage','storeApi.ts','StoreController','StoreService','StoreItemRepository','StudentRewardRepository'],calls:{
2:'getStoreCatalog(pageRequest) => catalog: StoreCatalogDTO',4:'getStoreCatalog(studentId, pageRequest) => catalog: StoreCatalogDTO',5:'findPublishedItems(pageRequest) => items: Page<StoreItemSummary>',16:'findCoinBalance(studentId) => balance: CoinBalance',19:'buildCatalogWithUnavailableBalance(items) => catalog: StoreCatalogDTO',25:'getStoreItem(itemId) => item: StoreItemDetail',27:'getStoreItem(studentId, itemId) => item: StoreItemDetail',28:'findDetailById(itemId) => item: StoreItem',30:'findOwnershipAndBalance(studentId, itemId) => studentState: StudentRewardState',35:'showOwnedItem(item, inventoryLink)'}},
'14.2':{names:['StudentRedeemItemPage','storeApi.ts','RedemptionController','RedemptionService','StoreItemRepository','CoinTransactionRepository','UserInventoryRepository'],calls:{
2:'previewRedemption(itemId) => preview: RedemptionPreview',4:'previewRedemption(studentId, itemId) => preview: RedemptionPreview',5:'findRedemptionConditions(itemId) => item: RedemptionItemState',7:'findCoinBalance(studentId) => balance: CoinBalance',9:'findOwnership(studentId, itemId) => ownership: ItemOwnership',11:'validateRedemptionEligibility(item, balance, ownership) => eligibility: RedemptionEligibility',21:'cancelPreview()',23:'redeemItem({itemId, confirmedPrice, requestKey}) => outcome: RedemptionOutcome',25:'redeemItem(studentId, request) => outcome: RedemptionOutcome',26:'findRedemptionByRequestKey(studentId, requestKey) => existingOutcome: RedemptionOutcome',32:'findRedemptionConditions(itemId) => currentItem: RedemptionItemState',34:'findCoinBalance(studentId) => currentBalance: CoinBalance',36:'findOwnership(studentId, itemId) => currentOwnership: ItemOwnership',46:'debitAndRecordRedemption(studentId, itemId, currentPrice, requestKey) => debit: CoinTransaction',47:'grantItem(studentId, itemId, debit.reference) => inventoryItem: UserInventoryItem',50:'commitRedemptionTransaction()',55:'rollbackRedemptionTransaction()'}},
'14.3':{names:['StudentInventoryPage','inventoryApi.ts','InventoryController','InventoryService','UserInventoryRepository','StoreItemRepository'],calls:{
2:'getInventory() => inventory: InventoryDTO',4:'getInventory(studentId) => inventory: InventoryDTO',5:'findOwnedItemsAndEquipment(studentId) => ownedItems: List<OwnedItem>',16:'findDetailsByIds(ownedItems.itemIds) => details: List<StoreItemDetail>',23:'showItemDetails(selectedItem)',28:'getMaterialAccess(itemId) => access: MaterialAccessResult',30:'getMaterialAccess(studentId, itemId) => access: MaterialAccessResult',31:'findUsableEntitlement(studentId, itemId) => entitlement: Optional<UsableEntitlement>'}},
'14.4':{names:['StudentInventoryPage','inventoryApi.ts','EquipmentController','EquipmentService','UserInventoryRepository','StoreItemRepository'],calls:{
2:'changeEquipment(itemId, action) => equipment: EquipmentDTO',4:'changeEquipment(studentId, itemId, action) => equipment: EquipmentDTO',5:'findOwnership(studentId, itemId) => ownership: Optional<ItemOwnership>',11:'findEquipmentProperties(itemId) => properties: EquipmentProperties',17:'findEquippedByType(studentId, properties.itemType) => previousItem: Optional<EquippedItem>',23:'prepareReplacement(previousItem, itemId) => equipmentChange: EquipmentChange',24:'replaceEquippedItem(studentId, properties.itemType, previousItem, itemId) => equipment: EquipmentDTO',31:'preservePreviousEquipment(previousItem)',40:'removeFromSlot(studentId, itemId, properties.itemType) => equipment: EquipmentDTO',47:'preservePreviousEquipment(previousItem)'}},
'16.1':{names:['StudentFeedbackFormPage','feedbackApi.ts','StudentFeedbackController','FeedbackSubmissionService','ContentReferenceRepository','FeedbackRepository'],calls:{
2:'openFeedbackForm(contentContext) => form: FeedbackForm',4:'prefillContentReference(contentContext)',6:'configureTechnicalIssueForm()',9:'cancelSubmission()',11:'trimAndValidateReport(form.category, form.description, form.contentRef, form.attachments) => validation: ValidationResult',13:'submitFeedback({category, description, contentRef, attachments}) => report: FeedbackReceipt',14:'submitFeedback(request, authentication) => report: FeedbackReceipt',15:'validateAndSanitize(request) => validatedRequest: FeedbackSubmissionRequest',16:'submitFeedback(studentId, validatedRequest) => report: FeedbackReceipt',17:'isValidReference(request.contentRef) => validReference: boolean',19:'validateAttachments(request.attachments, allowedImageTypes, maxSize: 3MB)',28:'save(Feedback{submitterId: studentId, category, description, contentRef, attachments, initialStatus, submittedAt}) => feedback: Feedback',30:'routeToModeratorReview(feedback)',31:'routeToAdminReview(feedback)',40:'retainFormInput(form)'}},
'16.2':{names:['StudentSubmittedFeedbackPage','feedbackApi.ts','StudentFeedbackController','StudentFeedbackService','FeedbackRepository','ContentReferenceRepository'],calls:{
2:'listMyFeedback(pageRequest) => reports: Page<FeedbackSummary>',4:'listMyFeedback(studentId, pageRequest) => reports: Page<FeedbackSummary>',5:'findBySubmitterId(studentId, pageRequest) => reports: Page<FeedbackSummary>',21:'getMyFeedback(feedbackId) => detail: StudentFeedbackDetail',23:'getMyFeedback(studentId, feedbackId) => detail: StudentFeedbackDetail',24:'findByIdAndSubmitterId(feedbackId, studentId) => feedback: Optional<Feedback>',30:'findStudentVisibleDetails(feedbackId, studentId) => detail: StudentFeedbackDetail',37:'isAccessible(detail.contentRef) => accessible: boolean',39:'retainReferenceWithoutNavigation(detail.contentRef)',43:'renderHandlingNotes(detail.handlingNotes)',44:'showNoHandlingNotes(detail.status)'}},
'17.1':{names:['ModeratorContentFeedbackListPage','contentFeedbackApi.ts','ContentFeedbackController','ContentFeedbackService','FeedbackRepository','CurriculumRepository'],calls:{
2:'listContentFeedback(query) => tickets: Page<ContentFeedbackSummary>',4:'listContentFeedback(moderatorId, query) => tickets: Page<ContentFeedbackSummary>',5:'restrictToAcademicContent(query)',6:'findContentFeedback(query, "pending first, createdAt DESC") => tickets: Page<ContentFeedbackSummary>',8:'findFeedbackContextAndFilterOptions(tickets.contentRefs) => context: FeedbackFilterContext',15:'trimKeywords(query.keyword)',16:'listContentFeedback({courseId, lessonId, status, keyword, pageRequest}) => tickets: Page<ContentFeedbackSummary>',18:'listContentFeedback(moderatorId, query) => tickets: Page<ContentFeedbackSummary>',19:'buildAcademicFeedbackCriteria(query) => criteria: FeedbackSearchCriteria',20:'searchContentFeedback(criteria) => tickets: Page<ContentFeedbackSummary>'}},
'17.2':{names:['ModeratorContentFeedbackDetailPage','contentFeedbackApi.ts','ContentFeedbackController','ContentFeedbackService','FeedbackRepository','CurriculumRepository'],calls:{
2:'getContentFeedback(feedbackId) => detail: ContentFeedbackDetail',4:'getContentFeedback(moderatorId, feedbackId) => detail: ContentFeedbackDetail',5:'findContentFeedbackDetail(feedbackId) => feedback: ContentFeedbackRecord',7:'findReportedContentContext(feedback.contentRef) => context: ReportedContentContext',12:'renderGeneralInformation(detail.student, detail.submittedAt, detail.category, detail.status)',13:'renderDescription(detail.title, detail.description)',14:'renderImagePreviews(detail.attachments)',15:'showNoImageAttachments()',18:'getReportedContentLink(feedbackId) => link: ContentVerificationLink',20:'getReportedContentLink(moderatorId, feedbackId) => link: ContentVerificationLink',21:'findAvailability(feedback.contentRef) => availability: ContentAvailability',26:'navigateToCurriculum(link)'}},
'17.3':{names:['ModeratorContentFeedbackDetailPage','contentFeedbackApi.ts','ContentFeedbackController','ContentFeedbackService','FeedbackRepository','NotificationService','EmailService'],calls:{
3:'trimAndValidateResolution(status, resolutionNote) => validation: ValidationResult',5:'processContentFeedback(feedbackId, {status, resolutionNote, expectedVersion}) => result: FeedbackResolutionResult',6:'processContentFeedback(feedbackId, request, authentication) => result: FeedbackResolutionResult',7:'validateAndSanitize(request) => validatedRequest: ResolutionRequest',8:'processContentFeedback(moderatorId, feedbackId, validatedRequest) => result: FeedbackResolutionResult',9:'validateTransitionAndRequiredNotes(currentStatus, request.status, request.resolutionNote)',14:'updateResolutionIfVersionMatches(feedbackId, expectedVersion, status, resolutionNote, moderatorId, completionTime) => updateResult: FeedbackUpdateResult',21:'createFeedbackResolutionNotification(submitterId, feedbackId, status, resolutionNote) => notification: Notification',23:'sendFeedbackResolutionEmail(studentEmail, feedbackId, status, resolutionNote) => emailResult: EmailSendResult',28:'refreshFeedbackViews(result); renderHandlingNotes(result.resolutionNote)'}},
'17.4':{names:['AdminTechnicalFeedbackListPage','technicalFeedbackApi.ts','TechnicalFeedbackController','TechnicalFeedbackService','FeedbackRepository'],calls:{
2:'listTechnicalFeedback(query) => tickets: Page<TechnicalFeedbackSummary>',4:'listTechnicalFeedback(adminId, query) => tickets: Page<TechnicalFeedbackSummary>',5:'restrictToTechnicalIssues(query)',6:'findTechnicalFeedback(query) => tickets: Page<TechnicalFeedbackSummary>',12:'showEmptyPendingMessage("MSG18")',15:'listTechnicalFeedback({status, keyword, pageRequest}) => tickets: Page<TechnicalFeedbackSummary>',17:'listTechnicalFeedback(adminId, query) => tickets: Page<TechnicalFeedbackSummary>',18:'searchTechnicalFeedback(query) => tickets: Page<TechnicalFeedbackSummary>'}},
'17.5':{names:['AdminTechnicalFeedbackDetailPage','technicalFeedbackApi.ts','TechnicalFeedbackController','TechnicalFeedbackService','FeedbackRepository','NotificationAndErrorLogService','EmailService'],calls:{
2:'getTechnicalFeedback(feedbackId) => detail: TechnicalFeedbackDetail',4:'getTechnicalFeedback(adminId, feedbackId) => detail: TechnicalFeedbackDetail',5:'findTechnicalFeedbackDetail(feedbackId) => detail: TechnicalFeedbackDetail',13:'trimAndValidateResolution(status, resolutionNote) => validation: ValidationResult',15:'resolveTechnicalFeedback(feedbackId, {status, resolutionNote}) => result: FeedbackResolutionResult',16:'resolveTechnicalFeedback(feedbackId, request, authentication) => result: FeedbackResolutionResult',17:'validateAndSanitize(request) => validatedRequest: ResolutionRequest',18:'resolveTechnicalFeedback(adminId, feedbackId, validatedRequest) => result: FeedbackResolutionResult',19:'validateRequiredResolutionNote(request.status, request.resolutionNote)',24:'saveResolution(feedbackId, status, resolutionNote) => feedback: Feedback',26:'createFeedbackResolutionNotification(submitterId, feedbackId, status, resolutionNote) => notification: Notification',28:'sendFeedbackResolutionEmail(studentEmail, feedbackId, status, resolutionNote) => emailResult: EmailSendResult',31:'logEmailException(feedbackId, emailException)',33:'commitResolutionDespiteEmailFailure(feedback)',37:'renderResolution(result.status, result.resolutionNote)'}}
};

function splitSignature(s){const [method,result]=s.split(' => ');return {method,result};}
function actorName(name,index,small){
 if(index===0)return name;
 if(small){return index===1?`«service»\n:${name}`:`«repository»\n:${name}`;}
 const stereotype=index===1?'boundary':index===2?'module':index===3?'controller':index===4?'service':/Service$/.test(name)?'service':'repository';
 return `«${stereotype}»\n${index===1||index===2?'':':'}${name}`;
}
function addAuthentication(method){return method.replace(/\)$/,method.endsWith('()')?'authentication)':', authentication)');}
for(const p of pages){
 const d=definitions[p.id];if(!d)throw Error('Missing page definition '+p.id);
 p.actors=[p.actors[0],...d.names.map((n,i)=>actorName(n,i+1,p.actors.length<5))];
 const small=p.actors.length<5;const rows=[],used=new Set(),lastReturns=new Map();let n=0,lastApi=null;
 for(const original of p.rows){const r={...original};if(r.type!=='call'&&r.type!=='reply'){rows.push(r);continue;}n++;
 if(r.type==='call'){
  let spec=d.calls[n];
  if(!spec&&r.a===2&&r.b===3&&!small){if(!lastApi)throw Error('Missing API context '+p.id+' '+n);spec=addAuthentication(lastApi.method)+(lastApi.result?' => '+lastApi.result:'');}
  if(!spec&&r.a!==0)throw Error('Missing function specification '+p.id+' '+n+' '+r.t);
  if(spec){used.add(n);const sig=splitSignature(spec);r.t=sig.method+(r.a===r.b&&sig.result?' => '+sig.result:'');if(sig.result)lastReturns.set(`${r.b}:${r.a}`,sig.result);if(r.a===1&&r.b===2)lastApi=sig;}
  rows.push(r);
  if(!small&&r.a===2&&r.b===3){const role=p.actors[0]==='Moderator'?'Moderator':p.actors[0]==='Administrator'?'Administrator':'Student';const identity=role==='Moderator'?'moderatorId':role==='Administrator'?'adminId':'studentId';rows.push({type:'call',a:3,b:3,t:`require${role}(authentication) => ${identity}; validate protected access (§5.2.1)`});}
 }else{
  if(r.b===0){rows.push(r);continue;}
  const expected=lastReturns.get(`${r.a}:${r.b}`);
  const isError=/error|failed|failure|cannot|not found|conflict|not owned|different submitter|not available|unavailable|deny access|do not disclose|request correction|require resolution notes|reload|do not permit|reject/i.test(r.t)&&!/No-data|no game history|No matching|Empty|no next milestone|practice results/i.test(r.t);
  r.t=isError?`failure: ${r.t}`:expected||`result: ${r.t}`;
  rows.push(r);
 }
 }
 for(const k of Object.keys(d.calls))if(!used.has(Number(k)))throw Error('Unused method mapping '+p.id+' '+k);
 p.rows=rows;
 // Existing SRS caveats remain visible; remove only wording that rejected function-level design.
 p.notes=p.notes.replace(/No HTTP method, request-key format or database locking mechanism is specified here\. /,'').replace(/No unspecified key algorithm, EXP amount, SQL, endpoint or coin amount is introduced\./,'Award-key format and reward amounts remain configurable.');
}
const C=(a,b,t)=>({type:'call',a,b,t}),T=(a,b,t)=>({type:'reply',a,b,t});
const before=(p,predicate,rows)=>{const k=p.rows.findIndex(predicate);if(k<0)throw Error('Insertion target missing '+p.id);p.rows.splice(k,0,...rows);};
const after=(p,predicate,rows)=>{const k=p.rows.findIndex(predicate);if(k<0)throw Error('Insertion target missing '+p.id);p.rows.splice(k+1,0,...rows);};
const page=id=>pages.find(p=>p.id===id);
{
 const p=page('11.1');p.actors.push('«repository»\n:GameSessionRepository');
 before(p,r=>r.type==='call'&&r.t.startsWith('validateSupportedContentType'),[
  C(4,5,'findById(selection.gameId)'),T(5,4,'game: GameConfiguration'),
  C(4,6,'findScope(selection.courseId, selection.scopeType, selection.scopeId)'),T(6,4,'selectedScope: CurriculumScope')
 ]);
 const init=p.rows.find(r=>r.type==='call'&&r.t.startsWith('initializeGame'));init.t='initializeGame(studentId, selection, game, content)';
 after(p,r=>r===init,[C(4,8,'saveOngoingSession(studentId, selection, content)'),T(8,4,'session: GameSession { sessionId, selectedScope, contentType }'),C(4,4,'buildGameSetup(session, game, content) => setup: GameSetup')]);
 p.notes+=' Proposed session persistence is supported by Section 3.1.5: game_session stores ongoing and completed sessions.';
}
{
 const p=page('11.2');p.actors.push('«module»\ngameEngine.ts','«repository»\n:GameContentRepository');
 // The SRS leaves action-level execution location open. Use a local game engine for interaction;
 // the server loads the session and content and computes the persisted final result independently.
 for(const r of p.rows){if(r.type==='call'&&r.a===1&&r.b===4)r.b=8;else if(r.type==='call'&&r.a===4&&r.b===4&&/checkAction|updateCurrentScore|skipCompletionReward/.test(r.t))r.a=r.b=8;else if(r.type==='reply'&&r.a===4&&r.b===1)r.a=8;}
 p.rows=p.rows.filter(r=>r.type!=='note'||!r.t.startsWith('Precondition: the game was initialized'));
 before(p,r=>r.type==='call'&&r.t.startsWith('calculateFinalResult'),[
 C(4,6,'findByIdAndStudentId(request.sessionId, studentId)'),T(6,4,'sessionState: GameSession'),
 C(4,9,'findContent(sessionState.scopeType, sessionState.scopeId, sessionState.contentType)'),T(9,4,'sessionContent: List<GameContentItem>'),
 C(4,4,'checkCompletionCondition(sessionState, request.submittedActions) => completed: boolean'),
 {type:'begin',kind:'break',guard:'[game is incomplete — UC-24 A2 / BR66]'},
 C(4,4,'endWithoutCompletionReward(sessionState)'),T(4,3,'result: IncompleteGameResult'),T(3,2,'result: IncompleteGameResult'),T(2,1,'result: IncompleteGameResult'),T(1,0,'The session ends without a completed-game reward'),{type:'end'}
 ]);
 const calc=p.rows.find(r=>r.type==='call'&&r.t.startsWith('calculateFinalResult'));calc.t='calculateFinalResult(sessionState, sessionContent, request.submittedActions) => evaluation: GameEvaluation';
 const award=p.rows.find(r=>r.type==='call'&&r.t.startsWith('awardCoins'));award.t='awardCoins(studentId, activityRef, rewardAllocation, awardKey)';
 before(p,r=>r===award,[C(4,4,'prepareRewardAllocation(evaluation, rewardRule, sessionState) => {activityRef, rewardAllocation, awardKey}')]);
 const awardReply=p.rows.find(r=>r.type==='reply'&&r.a===7&&r.b===4);
 after(p,r=>r===awardReply,[C(4,4,'getAwardedCoins(award) => coinsEarned: number')]);
 const exitIndex=p.rows.findIndex(r=>r.type==='call'&&r.t.startsWith('endIncompleteSession'));
 const exitReply=p.rows.slice(exitIndex+1).find(r=>r.type==='reply'&&r.a===8&&r.b===1);exitReply.t='result: SessionEnded';
 const savedResult=p.rows.find(r=>r.type==='call'&&r.t.startsWith('save(GameSession'));
 before(p,r=>r===savedResult,[C(4,4,'buildGameResult(sessionState, evaluation, coinsEarned) => completedSession: GameSession')]);
 savedResult.t='save(completedSession)';
 p.notes+=' Design allocation: immediate game interaction is handled by gameEngine.ts; GameService computes the persisted final result using server-loaded content, rather than accepting a submitted score.';
}
{
 const p=page('14.1');for(const r of p.rows){if(r.type==='call'&&r.t.startsWith('getStoreCatalog'))r.t=r.a===3?'getStoreCatalog(studentId)':r.a===2?'getStoreCatalog(authentication)':'getStoreCatalog()';if(r.type==='call'&&r.t.startsWith('findPublishedItems'))r.t='findPublishedItems()';if(r.type==='reply'&&r.t==='items: Page<StoreItemSummary>')r.t='items: List<StoreItemSummary>';}
}
{
 const p=page('12.3');p.actors[0]='Student';p.actors.push('«service»\n:CoinRewardService');
 const milestoneOpt=p.rows.find(r=>r.type==='begin'&&r.guard?.includes('milestone not yet rewarded'));
 after(p,r=>r===milestoneOpt,[C(4,9,'awardMilestoneCoins(studentId, milestone, streakRef)'),T(9,4,'award: CoinAwardResult')]);
 const record=p.rows.find(r=>r.type==='call'&&r.t.startsWith('recordDayAndReadStreak'));
 before(p,r=>r===record,[C(4,7,'recordQualifyingLearningDay(studentId, learningDate, completionTime)'),T(7,4,'learningDay: RecordedLearningDay')]);record.t='findLearningDaysAndStreak(studentId, learningDate)';
}
{
 const p=page('13.2');p.rows.find(r=>r.type==='call'&&r.a===0).t='awardCoins(studentId, activityRef, rewardAllocation, awardKey)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('resolveAwardKey')).t='validateAwardKey(studentId, activityRef, awardKey)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('creditCoinsAndExp')).t='creditCoinsAndExp(studentId, rewardAllocation.coinAmount, rewardAllocation.expAmount)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('save(CoinTransaction')).t='save(CoinTransaction{studentId, direction: EARN, amount: rewardAllocation.coinAmount, balanceAfter: balances.coinBalance, activityRef, awardKey})';
 p.notes+=' Coin / EXP amounts are supplied by the applicable reward allocation; no EXP formula is specified. Award-key uniqueness must be protected atomically as required by NS-08.';
}
{
 const p=page('14.2');p.actors.push('«repository»\n:CoinWalletRepository');
 after(p,r=>r.type==='call'&&r.a===3&&r.b===4&&r.t.startsWith('redeemItem'),[C(4,4,'readRedemptionRequest(request) => {itemId, confirmedPrice, requestKey}')]);
 for(const r of p.rows){if(r.type==='call'&&r.t.startsWith('findCoinBalance'))r.b=8;else if(r.type==='reply'&&r.a===6&&r.t==='balance: CoinBalance')r.a=8;else if(r.type==='reply'&&r.a===6&&r.t==='currentBalance: CoinBalance')r.a=8;}
 const debit=p.rows.find(r=>r.type==='call'&&r.t.startsWith('debitAndRecordRedemption'));
 before(p,r=>r===debit,[C(4,4,'validateConfirmedPrice(request.confirmedPrice, currentItem.price)'),C(4,4,'validateRedemptionEligibility(currentItem, currentBalance, currentOwnership)'),C(4,8,'debit(studentId, currentItem.price)'),T(8,4,'remainingBalance: CoinBalance')]);
 debit.t='saveRedemption(CoinTransaction{studentId, itemId, direction: SPEND, amount: currentItem.price, balanceAfter: remainingBalance, requestKey})';
 const debitReplyIndex=p.rows.findIndex(r=>r.type==='reply'&&r.a===6&&r.b===4&&r.t==='debit: CoinTransaction');
 const [debitReply]=p.rows.splice(debitReplyIndex,1);after(p,r=>r===debit,[debitReply]);
 const criticalIdx=p.rows.findIndex(r=>r.type==='begin'&&r.kind==='critical');const [critical]=p.rows.splice(criticalIdx,1);
 before(p,r=>r.type==='call'&&r.t==='findRedemptionConditions(itemId)'&&r!==p.rows.find(z=>z.type==='call'&&z.t==='findRedemptionConditions(itemId)'),[critical]);
 p.notes+=' Transaction boundary includes confirmation-time rechecks and the exchange; failures preserve both balance and ownership. Request-key uniqueness is part of the proposed implementation of UC-30 E2 and the common idempotency requirement.';
}
{
 const p=page('16.1');p.actors.push('«service»\n:FeedbackAttachmentService');
 before(p,r=>r.type==='call'&&r.t.startsWith('save(Feedback'),[
 C(4,4,'initializeAcceptedAttachments() => acceptedAttachments: List<AttachmentReference> = []'),
 {type:'begin',kind:'opt',guard:'[optional images are attached — UC-34 NF5 / A2]'},
 C(4,7,'saveAcceptedImages(request.attachments)'),
 {type:'begin',kind:'break',guard:'[attachment storage fails — UC-34 E3]'},
 T(7,4,'failure: AttachmentStorageError'),T(4,3,'failure: SubmissionError'),T(3,2,'failure: SubmissionError'),T(2,1,'failure: SubmissionError'),C(1,1,'retainFormInput(form)'),T(1,0,'Display failure; preserve entered information for correction / Retry'),{type:'end'},
 T(7,4,'acceptedAttachments: List<AttachmentReference>'),{type:'end'}
 ]);
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('save(Feedback')).t='save(Feedback{submitterId: studentId, category, description, contentRef, acceptedAttachments, initialStatus, submittedAt})';
 p.notes+=' FeedbackAttachmentService is a proposed separation of attachment persistence, not an additional SRS feature.';
}
{
 const p=page('17.3');before(p,r=>r.type==='call'&&r.t.startsWith('validateTransitionAndRequiredNotes'),[
 C(4,5,'findContentFeedbackById(feedbackId)'),T(5,4,'feedback: Feedback {currentStatus, submitterId, studentEmail, version}'),C(4,4,'requireContentFeedback(feedback)')
 ]);
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('validateTransitionAndRequiredNotes')).t='validateTransitionAndRequiredNotes(feedback.currentStatus, request.status, request.resolutionNote)';
 before(p,r=>r.type==='call'&&r.t.startsWith('updateResolutionIfVersionMatches'),[C(4,4,'currentTimestamp() => completionTime: Timestamp')]);
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('updateResolutionIfVersionMatches')).t='updateResolutionIfVersionMatches(feedbackId, request.expectedVersion, request.status, request.resolutionNote, moderatorId, completionTime)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('createFeedbackResolutionNotification')).t='createFeedbackResolutionNotification(feedback.submitterId, feedbackId, request.status, request.resolutionNote)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('sendFeedbackResolutionEmail')).t='sendFeedbackResolutionEmail(feedback.studentEmail, feedbackId, request.status, request.resolutionNote)';
 const successfulUpdate=p.rows.find(r=>r.type==='reply'&&r.a===5&&r.b===4&&r.t==='updateResult: FeedbackUpdateResult');
 after(p,r=>r===successfulUpdate,[C(4,5,'saveHandlingHistory(feedbackId, request.status, request.resolutionNote, moderatorId, completionTime)'),T(5,4,'historyEntry: FeedbackHandlingHistory')]);
 p.notes+=' expectedVersion is the proposed optimistic-lock token from the viewed ticket; exact field naming may change.';
}
{
 const p=page('17.5');before(p,r=>r.type==='call'&&r.t.startsWith('validateRequiredResolutionNote'),[
 C(4,5,'findTechnicalFeedbackById(feedbackId)'),T(5,4,'feedback: Feedback {submitterId, studentEmail, currentStatus}'),C(4,4,'requireTechnicalFeedback(feedback)')
 ]);
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('saveResolution')).t='saveResolution(feedbackId, request.status, request.resolutionNote)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('createFeedbackResolutionNotification')).t='createFeedbackResolutionNotification(feedback.submitterId, feedbackId, request.status, request.resolutionNote)';
 p.rows.find(r=>r.type==='call'&&r.t.startsWith('sendFeedbackResolutionEmail')).t='sendFeedbackResolutionEmail(feedback.studentEmail, feedbackId, request.status, request.resolutionNote)';
}
module.exports=pages;
