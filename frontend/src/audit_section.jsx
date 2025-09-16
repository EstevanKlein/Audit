                  {/* Audit Configuration */}
                  <div className="form-card">
                    <h3 className="form-title">Initiate Audit</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Audit Type</label>
                        <select 
                          className="form-select" 
                          value={auditType}
                          onChange={(e) => setAuditType(e.target.value)}
                        >
                          <option value="">Select audit type</option>
                          <option value="compliance">Compliance Audit</option>
                          <option value="financial">Financial Audit</option>
                          <option value="operational">Operational Audit</option>
                          <option value="security">Security Audit</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Account ID to Audit</label>
                        <input
                          className="form-input"
                          type="number"
                          placeholder="Enter account ID"
                          min="0"
                          value={auditAccountId}
                          onChange={(e) => setAuditAccountId(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <button 
                      className="form-submit-btn audit-submit-btn"
                      onClick={() => auditAccountId && initiateAudit(parseInt(auditAccountId))}
                      disabled={loading || !auditType || !auditAccountId}
                    >
                      {loading ? (
                        <>
                          <div className="loading-spinner"></div>
                          Initiating Audit...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">🔍</span>
                          Initiate Audit
                        </>
                      )}
                    </button>
                  </div>
