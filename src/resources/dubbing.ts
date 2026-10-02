import type AudioPod from '../client';
import type * as C from '../workflow-contracts';
import { canonicalUuid as uuid, uuidFields, scopeQuery } from '../workflow-utils';
import { APIError } from '../errors';

const base = '/api/v1/dubbing';
const resource = (kind: string, id: string, tail = '') => `${base}/${kind}/${uuid(id)}${tail}`;
const tokenPath = (token: string, tail = '') => `${base}/reviews/${encodeURIComponent(token)}${tail}`;

export class Dubbing {
  constructor(private client: AudioPod) {}
  capabilities(): Promise<C.DubbingCapabilities> { return this.client.get(`${base}/capabilities`); }
  adoptSource(uploadSessionId: string): Promise<C.DubbingSource> { return this.client.post(`${base}/sources`, { upload_session_id: uuid(uploadSessionId) }); }
  getSource(id: string): Promise<C.DubbingSource> { return this.client.get(resource('sources', id)); }
  sourceMedia(id: string): Promise<Buffer> { return this.client.getBytes(resource('sources', id, '/media')); }
  createProject(body: C.CreateDubbingProject): Promise<C.DubbingProject> { return this.client.post(`${base}/projects`, uuidFields(body)); }
  listProjects(params: { folder_id?: string; unfiled?: boolean; review?: 'pending' | 'complete'; completion?: 'pending' | 'complete' } = {}): Promise<{ items: C.DubbingProject[] }> { return this.client.get(`${base}/projects`, uuidFields(params)); }
  getProject(id: string): Promise<C.DubbingProject> { return this.client.get(resource('projects', id)); }
  deleteProject(id: string): Promise<{ project_id: string; state: 'purge_pending' }> { return this.client.delete(resource('projects', id)); }
  createEdition(id: string, body: C.CreateDubbingEdition): Promise<C.DubbingEdition> { return this.client.post(resource('projects', id, '/editions'), body); }
  getEdition(id: string): Promise<C.DubbingEdition> { return this.client.get(resource('editions', id)); }
  saveEdition(id: string, body: C.SaveDubbingEdition): Promise<C.DubbingEdition> { return this.client.put(resource('editions', id), body); }
  quote(id: string, retranslate = false): Promise<C.DubbingQuote> { return this.client.get(resource('editions', id, '/quote'), { retranslate }); }
  projectVoices(id: string): Promise<{ items: import('../types').Voice[] }> { return this.client.get(resource('projects', id, '/voices')); }
  analyze(id: string, body: C.AnalyzeDubbing): Promise<{ items: C.DubbingJob[] }> {
    if (body.confirm !== true) throw new TypeError('Explicit confirmation is required');
    return this.client.post(resource('projects', id, '/analyze'), { ...body, confirmations: body.confirmations.map(uuidFields) });
  }
  getJob(id: string): Promise<C.DubbingJob> { return this.client.get(resource('jobs', id)); }
  generate(id: string, body: C.GenerateDubbing): Promise<C.DubbingJob> {
    if (body.confirm !== true) throw new TypeError('Explicit confirmation is required');
    return this.client.post(resource('jobs', id, '/generate'), body);
  }
  retranslate(id: string, body: C.GenerateDubbing): Promise<C.DubbingJob> {
    if (body.confirm !== true) throw new TypeError('Explicit confirmation is required');
    return this.client.post(resource('jobs', id, '/retranslate'), body);
  }
  cancel(id: string): Promise<C.DubbingJob> { return this.client.post(resource('jobs', id, '/cancel')); }
  retryExports(id: string): Promise<C.DubbingJob> { return this.client.post(resource('jobs', id, '/retry-exports')); }
  events(id: string, after = 0): Promise<{ items: C.DubbingEvent[] }> { return this.client.get(resource('jobs', id, '/events'), { after }); }
  artifact(id: string, kind: C.DubbingOutput | 'speech'): Promise<Buffer> { return this.client.getBytes(resource('jobs', id, `/artifacts/${encodeURIComponent(kind)}`)); }
  reviewComplete(id: string, expectedRevision: number): Promise<C.DubbingEdition> { return this.client.post(resource('editions', id, '/review-complete'), { expected_revision: expectedRevision }); }
  listFolders(): Promise<{ items: C.DubbingFolder[] }> { return this.client.get(`${base}/folders`); }
  createFolder(body: Pick<C.DubbingFolder, 'label' | 'kind'>): Promise<C.DubbingFolder> { return this.client.post(`${base}/folders`, body); }
  renameFolder(id: string, body: Pick<C.DubbingFolder, 'label' | 'kind'>): Promise<C.DubbingFolder> { return this.client.put(resource('folders', id), body); }
  deleteFolder(id: string): Promise<{ deleted: boolean }> { return this.client.delete(resource('folders', id)); }
  moveProject(id: string, folderId: string | null): Promise<C.DubbingProject> { return this.client.put(resource('projects', id, '/folder'), { folder_id: folderId === null ? null : uuid(folderId) }); }
  getGlossary(scope: C.GlossaryScope): Promise<C.DubbingGlossary> { return this.client.get(`${base}/glossary`, uuidFields(scope)); }
  setGlossary(scope: C.GlossaryScope, body: C.GlossaryWrite): Promise<C.DubbingGlossary> { return this.client.put(`${base}/glossary?${scopeQuery(uuidFields(scope))}`, body); }
  resetGlossary(scope: C.GlossaryScope, version: number): Promise<C.DubbingGlossary> { return this.client.delete(`${base}/glossary?${scopeQuery(uuidFields(scope))}&expected_version=${version}`); }
  listTemplates(): Promise<{ items: C.DubbingTemplate[] }> { return this.client.get(`${base}/templates`); }
  saveTemplate(jobId: string, label: string): Promise<C.DubbingTemplate> { return this.client.post(`${base}/templates/from-job`, { job_id: uuid(jobId), label }); }
  fromTemplate(body: C.ProjectFromTemplate): Promise<C.DubbingProject> { return this.client.post(`${base}/projects/from-template`, uuidFields(body)); }
  inviteReviewer(editionId: string, recipientEmail: string): Promise<C.DubbingReviewGrant> { return this.client.post(resource('editions', editionId, '/review-grants'), { recipient_email: recipientEmail }); }
  listReviewGrants(editionId: string): Promise<{ items: C.DubbingReviewGrant[] }> { return this.client.get(resource('editions', editionId, '/review-grants')); }
  revokeReviewGrant(id: string): Promise<{ revoked: boolean }> { return this.client.delete(resource('review-grants', id)); }
  getReview(token: string): Promise<C.DubbingReview> { return this.client.get(tokenPath(token)); }
  addComment(token: string, body: C.WriteDubbingComment): Promise<C.DubbingComment> { return this.client.post(tokenPath(token, '/comments'), body); }
  approveReview(token: string, revision: number): Promise<{ approved: boolean; revision: number }> { return this.client.post(tokenPath(token, '/approve'), { expected_revision: revision }); }
  listReviewComments(editionId: string): Promise<{ items: C.DubbingComment[] }> { return this.client.get(resource('editions', editionId, '/review-comments')); }
  reviewMedia(grantId: string, kind: C.DubbingOutput): Promise<Buffer> { return this.client.getBytes(`${base}/reviews/media/${uuid(grantId)}/${encodeURIComponent(kind)}`); }

  /** Waits through asynchronous work; review/partial exports require a new user decision. */
  async waitForJob(id: string, { timeout = 300000, pollInterval = 2000 } = {}): Promise<C.DubbingJob> {
    const started = Date.now();
    while (true) {
      const job = await this.getJob(id);
      if (['completed', 'review_required', 'export_partial'].includes(job.status)) return job;
      if (['failed', 'cancelled', 'expired'].includes(job.status)) throw new APIError(job.error_code || `Dubbing ${job.status}`, undefined, { code: job.error_code, job });
      if (Date.now() - started >= timeout) throw new APIError(`Timed out waiting for dubbing job ${id}`, undefined, { code: 'wait_timeout', action: 'poll_job', job });
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}
