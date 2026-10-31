import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { NodeStatus } from '../../shared/models/node-status.model';
import { Node } from '../../shared/models/node.model';

@Injectable({ providedIn: 'root' })
export class NodesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getAll(): Observable<Node[]> {
    return this.http.get<Node[]>(`${this.apiBaseUrl}/nodes/`);
  }

  getById(nodeId: string): Observable<Node> {
    return this.http.get<Node>(`${this.apiBaseUrl}/nodes/${encodeURIComponent(nodeId)}/`);
  }

  getStatus(nodeId: string): Observable<NodeStatus> {
    return this.http.get<NodeStatus>(
      `${this.apiBaseUrl}/nodes/${encodeURIComponent(nodeId)}/status/`,
    );
  }
}
